<template>
    <div class="create-account">
        <h2>Looks like its your first time here!</h2>
        <form>
            <p class="h4 text-center mb-4">Sign in</p>
            <label for="defaultFormLoginEmailEx" class="grey-text">Your email</label>
            <input type="email" id="defaultFormLoginEmailEx" class="form-control"/>
            <br/>
            <label for="defaultFormLoginPasswordEx" class="grey-text">Your password</label>
            <input type="password" id="defaultFormLoginPasswordEx" class="form-control"/>
            <div class="text-center mt-4">
                <button class="btn btn-indigo" type="submit">Login</button>
            </div>
        </form>
    </div>
</template>

<script>
export default {
    name: 'login',
    data() {
        return {};
    },
    methods: {}
}
</script>

<style scoped>

</style>