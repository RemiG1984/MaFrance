<template>
  <span 
    class="hamburger"
    :class="{ active: opened }"
  ></span>
</template>

<script>
export default {
  name: 'HamburgerIcon',
  props: {
    opened: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped>
.hamburger,
.hamburger::before,
.hamburger::after {
  position: relative;
  display: block;
  width: 24px;
  height: 3px;
  background-color: currentColor;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hamburger::before,
.hamburger::after {
  content: '';
  position: absolute;
  left: 0;
}

.hamburger::before {
  top: -8px;
}

.hamburger::after {
  top: 8px;
}

/* État actif (croix) */
.hamburger.active {
  background-color: transparent;
}

.hamburger.active::before {
  transform: rotate(45deg);
  top: 0;
}

.hamburger.active::after {
  transform: rotate(-45deg);
  top: 0;
}</style>