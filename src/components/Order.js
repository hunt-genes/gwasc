import RaisedButton from 'material-ui/RaisedButton';
import TextField from 'material-ui/TextField';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import moment from 'moment';
import React from 'react';
import Relay from 'react-relay';
import theme from '../theme';
import OrderVariablesMutation from '../mutations/orderVariables';

class Order extends React.Component {
    static contextTypes = {
        relay: Relay.PropTypes.Environment,
        router: React.PropTypes.object.isRequired,
    }

    static childContextTypes = {
        muiTheme: React.PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        this.muiTheme = getMuiTheme(theme);
    }

    state = {
        selected: new Set(),
        project: '',
        comment: '',
        email: '',
        emailValid: true,
        emailWritten: false,
        ordered: false,
    }

    getChildContext() {
        return { muiTheme: getMuiTheme(theme) };
    }

    componentDidMount() {
        const selected = sessionStorage.getItem('orderSelected');
        if (selected) {
            this.setState({ selected: new Set(JSON.parse(selected).map(v => parseInt(v, 10)))});
        }
    }

    onSubmitOrder = (event) => {
        event.preventDefault();
        if (this.validateEmail(this.state.email) && this.state.project) {
            this.context.relay.commitUpdate(new OrderVariablesMutation({
                email: this.state.email,
                project: this.state.project,
                comment: this.state.comment,
                snps: Array.from(this.state.selected),
                site: this.props.site,
            }), {
                onSuccess: () => {
                    this.setState({
                        ordered: true,
                    });
                }
            });
        }
    }

    onChangeProject = (event, project) => {
        this.setState({ project });
    }

    onChangeComment = (event, comment) => {
        this.setState({ comment });
    }

    onChangeEmail = (event, email) => {
        if (this.state.emailWritten) {
            this.setState({ email, emailValid: this.validateEmail(email) })
        }
        else {
            this.setState({ email });
        }
    }

    onBlurEmail = () => {
        this.setState({ emailWritten: true, emailValid: this.validateEmail(this.state.email) });
    }

    validateEmail = (email) => email.match(/ntnu\.no$/)

    onClickBack = () => {
        this.context.router.goBack()
    }

    onClickDone = () => {
        this.setState({
            selected: new Set(),
            comment: '',
            // ordered: false,
        });
        sessionStorage.setItem('orderSelected', JSON.stringify([]));
        const query = this.props.location.query;
        this.context.router.push({ query });
    }

    render() {
        const normalStyle = {
            color: theme.palette.primary1Color,
        }
        const errorStyle = {
            color: theme.palette.errorColor,
        };
        const warningStyle = {
            color: theme.palette.accent1Color,
        };
        const snps = Array.from(this.state.selected);
        snps.sort((a, b) => b < a);
        return (
            <section>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    {this.state.ordered && this.props.site.order
                        ? <div>
                            <h1>Thank you for your order</h1>
                            <p>Your order was sent {moment(this.props.site.order.createdAt).format('lll')}, and contains the following SNPs:</p>
                            <ul>
                                {this.props.site.order.snps.map(snp => <li key={snp}>{snp}</li>)}
                            </ul>
                            <p>You will receive an email with a confirmation on submitted SNP-order to {this.props.site.order.email} shortly.</p>
                            <p>Please contact us if there is something wrong with your order</p>
                            <RaisedButton label="Done" onClick={this.onClickDone} />
                        </div>
                        : <div>
                            {snps.length
                                ? <form onSubmit={this.onSubmitOrder}>
                                    <h1>You have selected {snps.length} SNPs to order from HUNT</h1>
                                    <p>Please use your HUNT case number (saksnummer) as identification. To order SNP-data from HUNT, you need a submitted and/or approved HUNT-application. Please refer to the HUNT website for details for application procedures, <a href="https://www.ntnu.no/hunt">www.ntnu.no/hunt</a>.</p>
                                    <div>
                                        <TextField
                                            id="project"
                                            floatingLabelText="Project / case number"
                                            type="number"
                                            onChange={this.onChangeProject}
                                            value={this.state.project}
                                        />
                                    </div>
                                    <div>
                                        <TextField
                                            id="email"
                                            type="email"
                                            floatingLabelText="Email"
                                            onChange={this.onChangeEmail}
                                            onBlur={this.onBlurEmail}
                                            errorText={this.state.emailValid ? 'Your email, not to your PI or supervisor. We will use this for e-mail confirmation and later communications.' : 'Email is not valid, is it an @ntnu.no address?'}
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
                                    <p>Please verify your SNP-order before submitting.</p>
                                    <ul>
                                        {snps.map(snp => <li key={snp}>{snp}</li>)}
                                    </ul>
                                    <RaisedButton
                                        primary
                                        label="Send"
                                        type="submit"
                                    />
                                    <RaisedButton
                                        label="Back"
                                        onClick={this.onClickBack}
                                    />
                                </form>
                                : <div>
                                    <h1>You have selected no SNPs yet</h1>
                                    <p>Please go back and select some SNPs, if you want to order variables from HUNT</p>
                                    <RaisedButton
                                        label="Back"
                                        onClick={this.onClickBack}
                                    />
                                </div>
                            }
                        </div>
                    }
                </div>
            </section>
        );
    }
}

export default Relay.createContainer(Order, {
    fragments: {
        site: () => Relay.QL`
        fragment on Site {
            id
            order {
                id
                email
                snps
                createdAt
            }
            ${OrderVariablesMutation.getFragment('site')}
        }`,
        viewer: () => Relay.QL`
        fragment on User {
            id
        }`,
    },
});
