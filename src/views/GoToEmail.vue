<template>
  <div class="go-to-email">
    <div class="center-container">
      <p class="h4">Check your email for a sign-in link.</p>
      <p class="h4">You can close this page now.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GoToEmail'
}
</script>

<style scoped>
p.h4 {
    color: #FFF;
    text-align: center;
    font-size: 1.4em;
}

div.go-to-email {
    position: absolute;
    background-color: #2a8aad;
    width: 100%;
    height: 100%;
    right: 0;
    bottom: 0;
}

.center-container {
    border-radius: 25px;
    height: 150px;
    width: 400px;
    position: fixed;
    top: 50%;
    left: 50%;
    margin-top: -95px;
    margin-left: -200px;
    color: #2a8aad;
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
}
</style>