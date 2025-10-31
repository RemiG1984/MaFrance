<template>
  <div class="support-container">
    <v-card class="mb-4">
      <v-card-title class="text-h6 pb-0">
        Support the Project
      </v-card-title>

      <v-card-text>
        <p>If you'd like to support the project, you can send tips via cryptocurrency. Scan the QR code below to tip in Ethereum (ETH).</p>
        <div class="d-flex justify-center">
          <v-img
            src="/images/QR_ETH.png"
            alt="QR Code for Ethereum tipping"
            max-width="300"
            contain
          />
        </div>
        <p class="mt-4 text-center">
          Thank you for your support!
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
export default {
  name: 'Support',
  setup() {
    return {};
  }
};
</script>

<style scoped>
.support-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
