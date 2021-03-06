/* global window */
/* eslint "camelcase": 0 */

// Set state during browser rendring. This will cause a flicker, but we need it.
/* eslint "react/no-did-mount-set-state": 0 */

import Checkbox from 'material-ui/Checkbox';
import Dialog from 'material-ui/Dialog';
import DropDownMenu from 'material-ui/DropDownMenu';
import FlatButton from 'material-ui/FlatButton';
import MenuItem from 'material-ui/MenuItem';
import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import React from 'react';
import Relay from 'react-relay';
import prefix from '../prefix';
import theme from '../theme';
import Footer from './Footer';
import Link from './Link';
import SearchResults from './SearchResults';
import TraitList from './TraitList';
import Summary from './Summary';
import { validateEmail, validateProject } from '../lib/validations';
import ExternalLink from './ExternalLink';

const pageSize = 50;

class Search extends React.Component {
    static propTypes = {
        location: React.PropTypes.object,
        viewer: React.PropTypes.object,
        relay: React.PropTypes.object,
        site: React.PropTypes.object,
    }

    static contextTypes = {
        relay: Relay.PropTypes.Environment,
        router: React.PropTypes.object.isRequired,
    }

    static childContextTypes = {
        muiTheme: React.PropTypes.object.isRequired,
    }

    constructor(props) {
        super(props);
        this.muiTheme = getMuiTheme(theme);
    }

    state = {
        term: this.props.location.query.q || '',
        loading: false,
        selecting: false,
        selected: new Map(),
        orderDialogOpen: false,
        project: '',
        email: '',
        comment: '',
        emailValid: true,
        emailWritten: false,
        projectValid: true,
        projectWritten: false,
    }

    getChildContext() {
        return { muiTheme: this.muiTheme };
    }

    componentDidMount() {
        this.props.relay.setVariables({
            term: this.props.location.query.q,
            unique: this.props.location.query.unique === 'true',
            hunt: this.props.location.query.hunt === 'true',
            tromso: this.props.location.query.tromso === 'true',
        });
        const selected = window.localStorage.getItem('orderSelected');
        const email = window.localStorage.getItem('email');
        const project = window.localStorage.getItem('project');
        const comment = window.localStorage.getItem('comment');
        const newState = {};
        if (selected) {
            newState.selected = new Map(JSON.parse(selected));
        }
        if (email) {
            newState.email = email;
            newState.emailWritten = true;
        }
        if (project) {
            newState.project = project;
        }
        if (comment) {
            newState.comment = comment;
        }
        if (email && project && newState.selected && newState.selected.size) {
            newState.selecting = true;
        }
        this.setState(newState);
    }

    componentWillReceiveProps(nextProps) {
        // parsing of booleans from checkboxes has gotten completely
        // impossible, so we handle them in directly in the handler function,
        // by setting both the relay variable and updating the query param.
        const location = this.props.location;
        const newLocation = nextProps.location;
        const q = location.query.q;
        const newQ = newLocation.query.q;
        if (q !== newQ) {
            this.setState({ loading: true });
            this.props.relay.setVariables({
                term: newQ || '',
            }, () => { this.setState({ loading: false }); });
            this.setState({
                term: newQ || '',
            });
        }
    }

    onSearch = (event) => {
        event.preventDefault();
        this.context.router.push({
            pathname: prefix,
            query: { q: this.state.term },
        });
    }

    onClear = (event) => {
        event.preventDefault();
        this.context.router.push({
            pathname: prefix,
            query: { q: '' },
        });
    }

    onChange = (event, term) => {
        this.setState({ term });
    }

    onUniqueChange = () => {
        const unique = !this.props.relay.variables.unique;
        const query = this.props.location.query;
        query.unique = unique;
        this.setState({ loading: true });
        this.context.router.push({
            pathname: prefix,
            query,
        });
        this.props.relay.setVariables({ unique }, () => { this.setState({ loading: false }); });
    }

    onHuntChange = () => {
        const hunt = !this.props.relay.variables.hunt;
        const query = this.props.location.query;
        query.hunt = hunt;
        this.context.router.push({
            pathname: prefix,
            query,
        });
        this.props.relay.setVariables({ hunt });
    }

    onTromsoChange = () => {
        const tromso = !this.props.relay.variables.tromso;
        const query = this.props.location.query;
        query.tromso = tromso;
        this.context.router.push({
            pathname: prefix,
            query,
        });
        this.props.relay.setVariables({ tromso });
    }

    onOrderDialogClose = () => {
        this.setState({ orderDialogOpen: false });
    }

    onChangeProject = (event, project) => {
        if (this.state.projectWritten) {
            this.setState({ project, projectValid: validateProject(project) });
        }
        else {
            this.setState({ project });
        }
    }

    onChangeComment = (event, comment) => {
        this.setState({ comment });
    }

    onChangeEmail = (event, email) => {
        if (this.state.emailWritten) {
            this.setState({ email, emailValid: validateEmail(email) });
        }
        else {
            this.setState({ email });
        }
    }

    onBlurEmail = () => {
        this.setState({ emailWritten: true, emailValid: validateEmail(this.state.email) });
    }

    onBlurProject = () => {
        this.setState({ projectWritten: true, projectValid: validateProject(this.state.project) });
    }

    onClickOrderSave = (event) => {
        event.preventDefault();
        if (
            validateEmail(this.state.email) && this.state.project && this.props.relay.variables.hunt
        ) {
            this.setState({
                selecting: true,
                orderDialogOpen: false,
            });
            window.localStorage.setItem('project', this.state.project);
            window.localStorage.setItem('email', this.state.email);
            window.localStorage.setItem('comment', this.state.comment);
        }
    }

    loadMore = () => {
        const results = this.props.viewer.results;
        this.props.relay.setVariables({
            pageSize: results.edges.length + pageSize,
        });
    }

    toggleSelection = () => {
        this.setState({
            selecting: !!this.state.email && !!this.state.project && !this.state.selecting,
            orderDialogOpen: !this.state.email && !this.state.project,
        });
    }

    cancelSelection = () => {
        this.setState({
            selected: new Map(),
            selecting: false,
            email: '',
            project: '',
            comment: '',
        });
        window.localStorage.removeItem('orderSelected');
        window.localStorage.removeItem('email');
        window.localStorage.removeItem('project');
        window.localStorage.removeItem('comment');
    }

    toggleSelected = (result) => {
        const selected = this.state.selected;
        if (selected.has(result.snp_id_current)) {
            selected.delete(result.snp_id_current);
        }
        else {
            selected.set(result.snp_id_current, { traits: result.traits, genes: result.genes });
        }
        this.setState({ selected });
        window.localStorage.setItem('orderSelected', JSON.stringify(selected));
    }

    isSelected = (snp_id_current) => {
        return this.state.selected.has(snp_id_current);
    }

    render() {
        const examples = (
            <p>
                Examples: <Link to="?q=diabetes">diabetes</Link>
                , <Link to="?q=rs3820706">rs3820706</Link>
                , <Link to="?q=Chung S">Chung S</Link>
                , <Link to="?q=2q23.3">2q23.3</Link>
                , <Link to="?q=CACNB4">CACNB4</Link>
            </p>
        );
        // PDF with manual from Maiken
        const manual = (
            <p>
                Ordering SNPs: <ExternalLink href={`${prefix}/static/manual.pdf`}>User manual</ExternalLink>
            </p>
        );
        const help = (
            <div style={{ display: 'flex' }}>
                <div style={{ flexGrow: '1' }}>
                    {examples}
                    {manual}
                </div>
                <div id="checkboxes" style={{ display: 'flex' }}>
                    <div>
                        <Checkbox
                            label="Unique"
                            checked={this.props.relay.variables.unique}
                            onCheck={this.onUniqueChange}
                            iconStyle={{ margin: 0 }}
                            labelStyle={{ marginRight: 16 }}
                        />
                    </div>
                    <div>
                        <Checkbox
                            label="HUNT"
                            checked={this.props.relay.variables.hunt}
                            onCheck={this.onHuntChange}
                            iconStyle={{ margin: 0 }}
                            labelStyle={{ marginRight: 16 }}
                        />
                    </div>
                    <div>
                        <Checkbox
                            label="Tromsø"
                            checked={this.props.relay.variables.tromso}
                            onCheck={this.onTromsoChange}
                            iconStyle={{ margin: 0 }}
                            labelStyle={{ marginRight: 16 }}
                        />
                    </div>
                </div>
            </div>
        );

        const { emailValid, projectValid } = this.state;
        const orderActions = (
            <div>
                <RaisedButton
                    label="Save"
                    primary
                    onTouchTap={this.onClickOrderSave}
                    disabled={!emailValid || !projectValid || !this.props.relay.variables.hunt}
                />
                <RaisedButton
                    label="Cancel"
                    onTouchTap={this.onOrderDialogClose}
                />
            </div>
        );

        const biobanks = [
            {
                name: 'HUNT',
                selected: this.props.relay.variables.hunt,
            },
            /*
            {
                name: 'Tromsø',
                selected: this.props.relay.variables.tromso,
            },
            */
        ].map((biobank) => {
            return biobank.selected ? biobank.name : null;
        })
        .filter((biobank) => {
            return biobank;
        })
        .join(', ');

        const orderTitle = `Order SNP data ${biobanks.length ? 'from' : ''} ${biobanks}`;

        const errorStyle = {
            color: theme.palette.errorColor,
        };

        const warningStyle = {
            color: theme.palette.accent1Color,
        };

        return (
            <section>
                <Toolbar style={{ backgroundColor: theme.palette.canvasColor }}>
                    <ToolbarGroup />
                    <ToolbarGroup lastChild>
                        {this.state.selecting
                            ? null
                            : <FlatButton label="Order SNPs" onTouchTap={this.toggleSelection} />
                        }
                        {this.state.selecting
                            ? null
                            : <DropDownMenu value={1} style={{ marginTop: -6, marginRight: 0 }}>
                                <MenuItem primaryText="Export" value={1} />
                                <MenuItem primaryText=".csv" href={`${prefix}/export?q=${this.props.relay.variables.term}&unique=${this.props.relay.variables.unique}&tromso=${this.props.relay.variables.tromso}&hunt=${this.props.relay.variables.hunt}&format=csv`} download />
                                <MenuItem primaryText=".tsv" href={`${prefix}/export?q=${this.props.relay.variables.term}&unique=${this.props.relay.variables.unique}&tromso=${this.props.relay.variables.tromso}&hunt=${this.props.relay.variables.hunt}`} download />
                            </DropDownMenu>
                        }
                    </ToolbarGroup>
                </Toolbar>
                <Dialog
                    title={orderTitle}
                    actions={orderActions}
                    open={this.state.orderDialogOpen}
                    onRequestClose={this.onOrderDialogClose}
                    actionsContainerStyle={{ textAlign: 'inherit' }}
                    autoScrollBodyContent
                >
                    <div>
                        <Checkbox
                            label="HUNT"
                            checked={this.props.relay.variables.hunt}
                            onCheck={this.onHuntChange}
                            iconStyle={{ margin: 0 }}
                            labelStyle={{ marginRight: 16 }}
                        />
                    </div>
                    {this.props.relay.variables.hunt
                        ? <p>Please use your HUNT case number (saksnummer) as identification. To order SNP-data from HUNT, you need a submitted and/or approved HUNT-application. Please refer to the HUNT website for details for application procedures, <a href="https://www.ntnu.no/hunt">www.ntnu.no/hunt</a>.</p>
                        : null
                    }
                    <div>
                        <TextField
                            id="project"
                            floatingLabelText="Project / case number"
                            onChange={this.onChangeProject}
                            value={this.state.project}
                            onBlur={this.onBlurProject}
                            errorStyle={this.state.projectValid ? warningStyle : errorStyle}
                            errorText={this.state.projectValid ? 'Format: 2017/123' : 'Invalid project number, it should be like 2017/123'}
                        />
                    </div>
                    <div>
                        <TextField
                            id="email"
                            type="email"
                            floatingLabelText="Email"
                            onChange={this.onChangeEmail}
                            onBlur={this.onBlurEmail}
                            errorText={this.state.emailValid ? 'Your email, not to your PI or supervisor. We will use this for e-mail confirmation and later communications.' : 'Email is not valid'}
                            errorStyle={this.state.emailValid ? warningStyle : errorStyle}
                            fullWidth
                        />
                    </div>
                    <div>
                        <TextField
                            id="comment"
                            floatingLabelText="Comment"
                            fullWidth
                            multiLine
                            onChange={this.onChangeComment}
                            value={this.state.comment}
                        />
                    </div>
                    <p>You will be able to change the comment before submitting your order</p>
                </Dialog>

                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <form onSubmit={this.onSearch} onReset={this.onClear}>
                        <div style={{ display: 'flex' }}>
                            <div style={{ margin: '0 10px' }} id="logo">
                                <img
                                    src={`${prefix}/static/logo.jpg`}
                                    style={{ width: 50 }}
                                    alt=""
                                />
                            </div>
                            <div style={{ flexGrow: 1, margin: '0 10px' }}>
                                <h1 style={{ marginTop: 0 }}>
                                    HUNT fast-track GWAS catalog search
                                </h1>
                                <div style={{ display: 'flex' }}>
                                    <div style={{ flexGrow: '1' }}>
                                        <TextField
                                            id="query"
                                            placeholder="Search"
                                            onChange={this.onChange}
                                            value={this.state.term}
                                            fullWidth
                                        />
                                    </div>
                                    <div id="buttons" style={{ flexShrink: '1' }}>
                                        <RaisedButton
                                            label="Search"
                                            primary
                                            type="submit"
                                        />
                                        <RaisedButton
                                            label="Clear"
                                            type="reset"
                                        />
                                    </div>
                                </div>
                                <div>
                                    {help && <div>{help}</div>}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <Summary
                    term={this.props.location.query.q}
                    stats={this.props.viewer.stats}
                    unique={this.props.relay.variables.unique}
                    hunt={this.props.relay.variables.hunt}
                    tromso={this.props.relay.variables.tromso}
                    loading={this.state.loading}
                    selecting={this.state.selecting}
                    toggleSelection={this.toggleSelection}
                    cancelSelection={this.cancelSelection}
                    site={this.props.site}
                />
                {this.props.location.query.q
                    ? <div>
                        <SearchResults
                            results={this.props.viewer.results}
                            selecting={this.state.selecting}
                            toggleSelected={this.toggleSelected}
                            isSelected={this.isSelected}
                        />
                        {this.props.viewer.results.pageInfo.hasNextPage ?
                            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                <RaisedButton onClick={this.loadMore} label="Load more" />
                            </div>
                            : null
                        }
                    </div>
                    : <TraitList viewer={this.props.viewer} />
                }
                <Footer requests={this.props.viewer.requests} />
            </section>
        );
    }
}

export default Relay.createContainer(Search, {
    initialVariables: {
        term: '',
        pageSize,
        unique: false,
        tromso: false,
        hunt: false,
    },
    fragments: {
        viewer: () => {
            return Relay.QL`
            fragment on User {
                results(first: $pageSize, term: $term, unique: $unique, tromso: $tromso, hunt: $hunt)
                {
                    edges {
                        node {
                            id
                            snp_id_current
                            snps
                            date
                            genes
                            traits
                            disease_trait
                            or_or_beta
                            pubmedid
                            region
                            chr_id
                            chr_pos
                            context
                            p_value
                            p_value_text
                            p95_ci
                            date_added_to_catalog
                            first_author
                            journal
                            tromso {
                                maf
                                ref
                                alt
                                rsq
                                imputed
                                genotyped
                            }
                            hunt {
                                maf
                                ref
                                alt
                                rsq
                                imputed
                                genotyped
                            }
                        }
                    },
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
                stats(term: $term, tromso: $tromso, hunt: $hunt) {
                    total
                    unique
                }
                requests {
                    total
                    local
                }
                ${TraitList.getFragment('viewer')}
            }`;
        },
        site: () => {
            return Relay.QL`
            fragment on Site {
                id
            }`;
        },
    },
});
