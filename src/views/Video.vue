<template>
    <div class="main-video">
        <div id="connection-options" v-if="preview_screen">
            <button id="join-now-button">find a study buddy</button>
        </div>
        <video :src-object.prop.camel="localStream" autoplay muted ref="video" id="fullscreen-video"/>
    </div>
</template>

<script>
export default {
    name: 'Video',
    data() {
        return {
            preview_screen: true,
            searching: false,
            video_screen: false,
            localStream: null
        }
    },
    methods: {
        onLocalMediaStream: function() {
            if(this.localStream) {
                this.$refs.video.volume = 0
                this.$refs.video.srcObject = this.localStream
            }
        }
    },
    mounted() {
        const outer_this = this
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function(stream) {
            outer_this.localStream = stream
        })
        .catch(function(error) {
            console.log(error)
        })
    }
}
</script>

<style scoped>
#fullscreen-video {
    position: fixed;
    right: 0;
    bottom: 0;
    min-width: 100%;
    min-height: 100%;
}

#join-now-button {
    position: absolute;
    z-index: 2;
}
</style>