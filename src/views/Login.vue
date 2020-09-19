<template>
  <!-- Default form login -->
  <div class="email-login">
    <div class="login-container">
        <div>
            <p class="h4">Enter your email to get a sign-in link</p>
            <input class="email-input" type="email" placeholder="Email..." v-model="email"/>
        </div>
        <p v-if="unsupportedEmail" class="error">Oops looks like your email isnt supported yet. This service is currently only available for the universities of Imperial (the GOAT), UCL, LSE and KCL.</p>
        <br>
        <a v-on:click="login" class="button1 bouncy">Login</a>
    </div>
  </div>
  <!-- Default form login -->
</template>

<script>
import firebase from 'firebase';

export default {
    name: 'login',
    data() {
        return {
            email: '',
            unsupportedEmail: false
        };
    },
    methods: {
        login: function() {
            // regex to check that the input is both an email, and that the email belongs to participating unis
            let emailValidator = new RegExp("[\\w\\d\\.]+@(?:(?:imperial)|(?:gmail)|(?:ucl)|(?:lse)|(?:kcl))(?:(?:\\.ac\\.uk)|(?:\\.com))","i")

            if(emailValidator.test(this.email)) {
                var actionCodeSettings = {
                    // URL you want to redirect back to. The domain (www.example.com) for this
                    // URL must be whitelisted in the Firebase Console.
                    url: 'https://www.study-roulette.com/#/complete-login',
                    // This must be true.
                    handleCodeInApp: true
                };

                // set outer_this so that the this.email property can be accessed within the firebase future promise
                var outer_this = this

                // sends a sign-in link to the user's email
                firebase.auth().sendSignInLinkToEmail(this.email, actionCodeSettings)
                .then(function() {
                    let loginInfo = {
                        email: outer_this.email
                    }

                    // place email in local storage so it can be retrieved later to complete the sign in process
                    // once the user has clicked on the sign in link
                    localStorage.setItem('studyRouletteLoginInfo', JSON.stringify(loginInfo))

                    // redirect the user to the GoToEmail page to prompt them to check their email
                    outer_this.$router.push('go-to-email')
                    })
                .catch(function(error) {
                    console.log(error)
                    if(error.code) {
                        console.log(error.code)
                    }
                    alert("Oops there's an issue. Check your internet or try again in a few minutes.")
                });
            } else {
                // set email error to true to inform the user that the issue is with the email they've typed in
                this.unsupportedEmail = true
            }
        }
    }
}
</script>

<style scoped>
p.h4 {
    color: #FFF;
    text-align: left;
    font-size: 1.4em;
}

p.error {
    color: #FBB;
    font-size: 0.9em;
    text-align: left;
}

div.email-login {
    position: absolute;
    background-color: #2a8aad;
    width: 100%;
    height: 100%;
    right: 0;
    bottom: 0;
}

input.email-input {
    display:inline-block;
    height: 40px;
    width: 100%;
    border:0.1em solid #FFFFFF;
    margin:0 0.3em 0.3em 0;
    border-radius:0.12em;
    box-sizing: border-box;
    text-decoration:none;
    font-family:'Roboto',sans-serif;
    font-weight:300;
    color:#FFFFFF;
    background-color: #2a8aad;
    text-align:left;
    transition: all 0.2s;
    font-size: 1em;
}

input.email-input:focus {
    outline: none;
}

::placeholder {
    color: #FFFFFF;
    font-family:'Roboto',sans-serif;
    font-weight:300;
}

a.button1{
    display:inline-block;
    padding:0.60em 1.2em;
    height: 40px;
    width: 30%;
    border:0.1em solid #FFFFFF;
    margin:0 0.3em 0.3em 0;
    border-radius:0.12em;
    box-sizing: border-box;
    text-decoration:none;
    font-family:'Roboto',sans-serif;
    font-weight:300;
    color:#FFFFFF;
    text-align:center;
    transition: all 0.2s;
}

a.button1:hover{
    color:#2a8aad;
    background-color:#FFFFFF;
}

@media all and (max-width:30em){
    a.button1{
        display:block;
        margin:0.4em auto;
    }
}

.login-container {
    border-radius: 25px;
    height: 300px;
    width: 600px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -170px;
    margin-left: -300px;
    color: #2a8aad;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}
</style>