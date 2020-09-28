<template>
  <div class="complete-login">
    <h2>Give us a second</h2>
    <div class="login-error" v-if="loginError">
        <h2>Looks like there's a problem with your link...</h2>
    </div>
  </div>
</template>

<script>
import firebase from 'firebase'

export default {
    name: 'CompleteLogin',
    data() {
        return {
            email: '',
            needEmail: false,
            loginError: false
        };
    },
    mounted() {
        if(firebase.auth().isSignInWithEmailLink(window.location.href)) {
            const loginInfo = JSON.parse(localStorage.getItem('studyRouletteLoginInfo'))
            localStorage.removeItem('studyRouletteLoginInfo')
            if(loginInfo) {
                console.log(loginInfo.email)
                this.email = loginInfo.email

            } else {
                this.email = window.prompt("Please re-enter the email you used earlier.")
            }

            const outer_this = this

            firebase.auth().signInWithEmailLink(this.email, window.location.href)
            .then(function(result) {
                console.log(result.additionalUserInfo.isNewUser)
                outer_this.$router.push('video')
            })
            .catch(function(error) {
                if(error.code) {
                    console.log(error.code)
                } else {
                    console.log(error)
                }
            })
        }
    }
}
</script>