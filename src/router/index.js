import Vue from 'vue'
import firebase from 'firebase'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import GoToEmail from '../views/GoToEmail.vue'
import CompleteLogin from '../views/CompleteLogin.vue'
import Video from '../views/Video.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '*',
    redirect: '/login'
  },
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/go-to-email',
    name: 'GoToEmail',
    component: GoToEmail
  },
  {
    path: '/complete-login',
    name: 'CompleteLogin',
    component: CompleteLogin
  },
  {
    path:'/video',
    name: 'Video',
    component: Video,
    meta: {
      requiresAuth: true
    }
  }
]

const router = new VueRouter({
  routes
})

router.beforeEach((to, from, next) => {
  const currentUser = firebase.auth().currentUser;
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if(requiresAuth && !currentUser) next('login');
  else if (!requiresAuth && currentUser) next('video');
  else next();
});

export default router
