import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HamburgerIcon from '../HamburgerIcon.vue'

describe('HamburgerIcon', () => {
  it('renders correctly when closed', () => {
    const wrapper = mount(HamburgerIcon, {
      props: {
        opened: false
      }
    })

    expect(wrapper.classes()).not.toContain('active')
    expect(wrapper.attributes('class')).toContain('hamburger')
  })

  it('renders correctly when opened', () => {
    const wrapper = mount(HamburgerIcon, {
      props: {
        opened: true
      }
    })

    expect(wrapper.classes()).toContain('active')
  })

  it('has correct default prop value', () => {
    const wrapper = mount(HamburgerIcon)

    expect(wrapper.props('opened')).toBe(false)
    expect(wrapper.classes()).not.toContain('active')
  })

  it('applies active class when opened prop is true', () => {
    const wrapper = mount(HamburgerIcon, {
      props: {
        opened: true
      }
    })

    expect(wrapper.classes()).toContain('active')
  })
})