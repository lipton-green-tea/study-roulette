<template>
  <!-- Default form login -->
  <div class="email-login">
    <p class="h4 text-center mb-4">Enter your email to sign in or create an account</p>
    <input type="email" v-model="email" id="defaultFormLoginEmailEx"/>
    <div class="text-center mt-4">
      <button class="btn btn-indigo" @click="login">Login</button>
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
            emailError: false
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
                    url: 'http://localhost:8080/#/complete-login',
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
                this.emailError = true
            }
        }
    }
}
</script>

<style scoped>

</style>