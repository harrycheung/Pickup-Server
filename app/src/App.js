
// @flow

import React from 'react';
import { Nav, Navbar, NavItem } from 'react-bootstrap';

import firebase from './firebase';
import './App.css';

class FBImage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      url: '',
    };
  }

  componentDidMount() {
    firebase.storage().ref(`images/${this.props.image}`).getDownloadURL()
      .then(url => {
        // console.log('got download url', url);
        this.setState({ url });
      });
  }

  render() {
    if (this.state.url !== '') {
      return <img src={this.state.url} {...this.props} />
    }
    return <div />;
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      user: null,
      users: {},
    };

    this.handleChangeEmail = this.handleChangeEmail.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
    // this.handleChangePhone = this.handleChangePhone.bind(this);
    // this.handlePhone = this.handlePhone.bind(this);
    // this.handleChangeCode = this.handleChangeCode.bind(this);
    // this.handleCode = this.handleCode.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
  }

  handleChangeEmail(event) {
    this.setState({ email: event.target.value });
  }

  handleChangePassword(event) {
    this.setState({ password: event.target.value });
  }

  login(event) {
    firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password)
      .catch(error => {
        console.log('Error signing in', error);
      });
    event.preventDefault();
  }

  // handleChangePhone(event) {
  //   this.setState({ phone: event.target.value });
  // }
  //
  // handlePhone(event) {
  //   // reCAPTCHA solved, allow signInWithPhoneNumber.
  //   firebase.auth().signInWithPhoneNumber(`+1${this.state.phone}`, this.recaptchaVerifier)
  //     .then(confirmationResult => {
  //       // SMS sent. Prompt user to type the code from the message, then sign the
  //       // user in with confirmationResult.confirm(code).
  //       this.confirmationResult = confirmationResult;
  //     }).catch(error => {
  //       // Error; SMS not sent
  //       // ...
  //     });
  //   event.preventDefault();
  // }
  //
  // handleChangeCode(event) {
  //   this.setState({ code: event.target.value });
  // }
  //
  // handleCode(event) {
  //   this.confirmationResult.confirm(this.state.code)
  //     .then(result => {
  //       // User signed in successfully.
  //       this.setState({ user: result.user });
  //       console.log('Signed in', result.user);
  //       return firebase.database().ref("users").once('value');
  //     }).then(snapshot => {
  //       const users = snapshot.val();
  //       console.log(users);
  //       this.setState({ users });
  //     }).catch(error => {
  //       // User couldn't sign in (bad verification code?)
  //       console.log('Error signing in');
  //     });
  //   event.preventDefault();
  // }

  changeAdmin(userUid, admin) {
    firebase.database().ref(`users/${userUid}/admin`).set(admin)
      .then(() => {
        const users = Object.assign({}, this.state.users);
        users[userUid].admin = admin;
        this.setState({ users });
      });
  }

  logout() {
    firebase.auth().signOut().then(() => {
      // Sign-out successful.
      console.log('Signout successful');
      this.setState({ user: null, users: {} });
    }).catch(error => {
      console.log('Error signing out', error);
      // An error happened.
    });
  }

  componentDidMount() {
    // if (this.state.user === null) {
    //   this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
    //     'phoneSubmit',
    //     { size: 'invisible' },
    //   );
    // }
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        this.setState({ user: { email: user.email } });
        console.log('Signed in', user.email);
        firebase.database().ref("users").once('value')
          .then(snapshot => {
            const users = snapshot.val();
            this.setState({ users });
          });
      } else {
        // User is signed out.
        // ...
      }
    });
  }

  render() {
    if (this.state.user !== null) {
      // eslint-disable-next-line
      const User = (props) => (
        <div
          style={{
            width: 200,
            margin: 10,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FBImage
            image={props.user.image}
            width="50"
            height="50"
            style={{
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              flex: 1,
              textAlign: 'left',
              padding: 10,
            }}
          >
            {props.user.name}
          </div>
          <input
            type="checkbox"
            checked={props.user.admin}
            onChange={(event) => this.changeAdmin(props.userKey, !props.user.admin)}
          />
        </div>
      );

      return (
        <div className="App">
          <Navbar>
            <Navbar.Header>
              <Navbar.Brand>
                Synapse Pickup Admin
              </Navbar.Brand>
              <Navbar.Toggle />
            </Navbar.Header>
            <Nav pullRight>
              <Navbar.Text>{this.state.user.email}</Navbar.Text>
              <NavItem eventKey={1} onClick={this.logout}>Logout</NavItem>
            </Nav>
          </Navbar>
          <div
            className="container"
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
            }}
          >
            {Object.keys(this.state.users).map(key => {
              return <User key={key} userKey={key} user={this.state.users[key]} />;
            }
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <form
            style={{
              borderWidth: 1,
              borderColor: 'red',
              borderRadius: 5,
              width: 200,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 20,
            }}
            onSubmit={this.login}
          >
            <h4>Login</h4>
            <input type="text" value={this.state.email} onChange={this.handleChangeEmail} />
            <input type="password" value={this.state.password} onChange={this.handleChangePassword} />
            <input id="phoneSubmit" type="submit" value="Submit" />
          </form>
        </div>
      )
    }
  }
}

// <form
//   style={{
//     borderWidth: 1,
//     borderColor: 'red',
//     borderRadius: 5,
//     width: 200,
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'center',
//     padding: 20,
//   }}
//   onSubmit={this.handlePhone}
// >
//   <h3>Phone</h3>
//   <input type="text" value={this.state.phone} onChange={this.handleChangePhone} />
//   <input id="phoneSubmit" type="submit" value="Submit" />
// </form>
// <form
//   style={{
//     borderWidth: 1,
//     borderColor: 'red',
//     borderRadius: 5,
//     width: 200,
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'center',
//     padding: 20,
//   }}
//   onSubmit={this.handleCode}
// >
//   <h3>Code</h3>
//   <input type="text" value={this.state.code} onChange={this.handleChangeCode} />
//   <input type="submit" value="Submit" />
// </form>

export default App;
