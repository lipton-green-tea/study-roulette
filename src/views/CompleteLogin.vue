<template>
    <div class="complete-login">
        <div class="please-wait" v-if="!loginError">
            <h2>Give us a second</h2>
        </div>
        <div class="login-error" v-if="loginError">
            <h2>Looks like there's a problem with your link...</h2>
            <p>Make sure you're not using an expired link (they're lazy so they only work once).</p>
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
                outer_this.loginError = true;
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

<style scoped>
div.complete-login {
    position: absolute;
    background-color: #2a8aad;
    width: 100%;
    height: 100%;
    right: 0;
    bottom: 0;
}

.please-wait {
    border-radius: 25px;
    height: 300px;
    width: 600px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -170px;
    margin-left: -300px;
    color: #ffffff;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}

.login-error {
    border-radius: 25px;
    height: 120px;
    width: 600px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -80px;
    margin-left: -300px;
    color: #ffffff;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}
</style>