import Vue from 'vue'
import firebase from 'firebase'
import App from './App.vue'
import router from './router'

Vue.config.productionTip = false

var firebaseConfig = {
  apiKey: "AIzaSyDGQK02xPGFwhRpcB3Kqy0wYZa8E67oOBs",
  authDomain: "study-roule.firebaseapp.com",
  databaseURL: "https://study-roule.firebaseio.com",
  projectId: "study-roule",
  storageBucket: "study-roule.appspot.com",
  messagingSenderId: "42030203914",
  appId: "1:42030203914:web:10347a4b968453ce244bf3",
  measurementId: "G-Q5KV0SJ93N"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
