/* eslint "camelcase": 0 */
/* eslint "no-console": 0 */
/* eslint "no-param-reassign": 0 */

import {
    GraphQLBoolean,
    GraphQLList,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
    GraphQLInt,
    GraphQLFloat,
} from 'graphql';

import {
  fromGlobalId,
  globalIdField,
  nodeDefinitions,
  connectionDefinitions,
  connectionArgs,
  connectionFromArray,
  mutationWithClientMutationId,
} from 'graphql-relay';

import config from 'config';
import connectionFromMongooseQuery from 'relay-mongoose-connection';
import GraphQLDate from 'graphql-custom-datetype';
import nodemailer from 'nodemailer';
import sendmailTransport from 'nodemailer-sendmail-transport';

import ip from 'ip';

import Result from './models/Result';
import Trait from './models/Trait';
import Request from './models/Request';
import Order from './models/Order';
import Site from './models/Site';
import prepareQuery from './models/prepareQuery';

const transporter = nodemailer.createTransport(sendmailTransport());

let resultType;
let userType;
let siteType;

const { nodeInterface, nodeField } = nodeDefinitions(
    (globalId) => {
        const { type, id } = fromGlobalId(globalId);
        if (type === 'Result') {
            return Result.findById(id).exec();
        }
        if (type === 'User') {
            return { _type: 'User' };
        }
        if (type === 'Site') {
            return { _type: 'Site' };
        }
        return undefined;
    },
    (obj) => {
        if (obj._type === 'Result') {
            return resultType;
        }
        if (obj._type === 'User') {
            return userType;
        }
        if (obj._type === 'Site') {
            return siteType;
        }
        return null;
    },
);

const traitType = new GraphQLObjectType({
    name: 'Trait',
    fields: {
        id: { type: GraphQLString },
        uri: { type: GraphQLString },
    },
});

const orderType = new GraphQLObjectType({
    name: 'Order',
    fields: {
        id: globalIdField('Order'),
        project: { type: GraphQLString },
        email: { type: GraphQLString },
        comment: { type: GraphQLString },
        snps: { type: new GraphQLList(GraphQLString) },
        createdAt: { type: GraphQLDate },
    },
});

resultType = new GraphQLObjectType({
    name: 'Result',
    fields: {
        id: globalIdField('Result'),
        snp_id_current: {
            type: GraphQLInt,
            resolve: ({ snp_id_current }) => {
                if (snp_id_current) {
                    return parseInt(snp_id_current, 10);
                }
                return null;
            },
        },
        snps: { type: GraphQLString },
        pubmedid: { type: GraphQLString },
        mapped_trait: { type: GraphQLString },
        mapped_gene: { type: GraphQLString },
        date: { type: GraphQLString },
        or_or_beta: { type: GraphQLString },
        strongest_snp_risk_allele: { type: GraphQLString },
        p_value: { type: GraphQLString },
        p_value_text: { type: GraphQLString },
        region: { type: GraphQLString },
        chr_id: { type: GraphQLString },
        chr_pos: { type: GraphQLInt },
        context: { type: GraphQLString },
        p95_ci: { type: GraphQLString },
        date_added_to_catalog: { type: GraphQLString },
        first_author: { type: GraphQLString },
        journal: { type: GraphQLString },
        disease_trait: { type: GraphQLString },
        traits: { type: new GraphQLList(GraphQLString) },
        genes: { type: new GraphQLList(GraphQLString) },
        tromso: { type: new GraphQLList(new GraphQLObjectType({
            name: 'Tromso',
            fields: {
                ref: { type: GraphQLString },
                alt: { type: GraphQLString },
                maf: { type: GraphQLFloat },
                avgcall: { type: GraphQLFloat },
                rsq: { type: GraphQLFloat },
                genotyped: { type: GraphQLBoolean },
                imputed: { type: GraphQLBoolean },
            },
        })) },
        hunt: { type: new GraphQLList(new GraphQLObjectType({
            name: 'Hunt',
            fields: {
                ref: { type: GraphQLString },
                alt: { type: GraphQLString },
                maf: { type: GraphQLFloat },
                avgcall: { type: GraphQLFloat },
                rsq: { type: GraphQLFloat },
                genotyped: { type: GraphQLBoolean },
                imputed: { type: GraphQLBoolean },
            },
        })) },
    },
    interfaces: [nodeInterface],
});

const resultConnection = connectionDefinitions({
    name: 'Result',
    nodeType: resultType,
});

userType = new GraphQLObjectType({
    name: 'User',
    fields: {
        id: globalIdField('User'),
        results: {
            type: resultConnection.connectionType,
            args: {
                term: { type: GraphQLString },
                unique: { type: GraphQLBoolean },
                tromso: { type: GraphQLBoolean },
                hunt: { type: GraphQLBoolean },
                ...connectionArgs,
            },
            resolve: (term, args) => { // term here is unused for now, coming from server
                if (!args.term || args.term.length < 3) {
                    return connectionFromArray([], args);
                }
                const query = prepareQuery(args.term, args.unique, args.tromso, args.hunt);
                return connectionFromMongooseQuery(
                    Result.find(query).sort('sortable_chr_id chr_pos'),
                    args,
                );
            },
        },
        stats: {
            type: new GraphQLObjectType({
                name: 'Stats',
                fields: {
                    unique: { type: GraphQLInt },
                    total: { type: GraphQLInt },
                },
            }),
            args: {
                term: { type: GraphQLString },
                tromso: { type: GraphQLBoolean },
                hunt: { type: GraphQLBoolean },
            },
            resolve: (_, args) => {
                return Result.aggregate(
                    { $match: prepareQuery(args.term, null, args.tromso, args.hunt) },
                    { $group: { _id: '$snp_id_current', count: { $sum: 1 } } },
                ).exec().then((count) => {
                    const total = count.reduce((previous, current) => {
                        return previous + current.count;
                    }, 0);
                    const unique = count.length;
                    return {
                        unique,
                        total,
                    };
                });
            },
        },
        traits: {
            type: new GraphQLList(traitType),
            resolve: () => {
                return Trait.find().sort('_id').exec();
            },
        },
        requests: {
            type: new GraphQLObjectType({
                name: 'Requests',
                fields: {
                    local: { type: GraphQLInt },
                    total: { type: GraphQLInt },
                },
            }),
            resolve: () => {
                return Request.count().exec().then((total) => {
                    const localStart = ip.toBuffer('129.241.0.0');
                    const localEnd = ip.toBuffer('129.241.255.255');
                    return Request.count({
                        $and: [
                            { remote_address: { $gte: localStart } },
                            { remote_address: { $lte: localEnd } },
                        ],
                    }).exec().then((local) => {
                        return {
                            total,
                            local,
                        };
                    });
                });
            },
        },
    },
    interfaces: [nodeInterface],
});

siteType = new GraphQLObjectType({
    name: 'Site',
    fields: () => {
        return {
            id: globalIdField('Site'),
            order: { type: orderType },
            email: {
                type: GraphQLString,
                resolve: () => {
                    return config.email && config.email.hunt && config.email.hunt.from;
                },
            },
        };
    },
});

const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        node: nodeField,
        viewer: {
            type: userType,
            resolve: (_) => {
                return _;
            },
        },
        site: {
            type: siteType,
            resolve: ({ site }) => {
                return site;
            },
        },
    },
});

const mutationOrderVariables = mutationWithClientMutationId({
    name: 'OrderVariables',
    inputFields: {
        snps: { type: new GraphQLList(GraphQLString) },
        project: { type: GraphQLString },
        email: { type: GraphQLString },
        comment: { type: GraphQLString },
    },
    outputFields: {
        site: {
            type: siteType,
            resolve: (payload) => {
                return payload;
            },
        },
    },
    mutateAndGetPayload: ({ snps, project, email, comment }, { site }) => {
        // TODO: Check email
        return Site.findById(site.id).exec().then((_site) => {
            return Order.create({ snps, project, email, comment })
            .then((order) => {
                // FIXME: cheating in scrabble, and assuming hunt
                if (config.email && config.email.hunt) {
                    // mailing HUNT:
                    const message = `${order.email} in project ${order.project} orders the SNPs in the attachment. Optional comment:\r\n\r\n${order.comment}`;
                    const attachment = {
                        content: snps.join('\r\n'),
                        contentType: 'text/csv',
                    };
                    const data = {
                        from: order.email,
                        to: config.email.hunt.to,
                        subject: 'New SNP order',
                        text: message,
                        attachments: [attachment],
                    };
                    transporter.sendMail(data, (err, info) => {
                        console.info('ORDER', err, info);
                        if (!err) {
                            // sending confirmation
                            const confirmMessage = `This is an automatic message from HUNT\r\n\r\n${order.project}\r\n${order.comment}\r\n\r\nYour order has been received and your SNP-data order will be added to your HUNT application. Any questions regarding the application or case proceedings, please send to hunt@medisin.ntnu.no`;
                            const confirmAttachment = {
                                content: snps.join('\r\n'),
                                filename: 'snps.txt',
                            };
                            const confirmData = {
                                from: config.email.hunt.from,
                                to: order.email,
                                subject: 'Order confirmation from HUNT',
                                text: confirmMessage,
                                attachments: [confirmAttachment],
                            };
                            transporter.sendMail(confirmData, (_err, _info) => {
                                console.info('CONFIRMATION', _err, _info);
                            });
                        }
                    });
                }
                return order; // assume sending went well
            })
            .then((order) => {
                _site.order = order;
                return _site;
            });
        });
    },
});

const mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => {
        return {
            orderVariables: mutationOrderVariables,
        };
    },
});

const schema = new GraphQLSchema({
    query: queryType,
    mutation: mutationType,
});

export default schema;
