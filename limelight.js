export default class Limelight {
  constructor (config) {
    Limelight.elements = Limelight.elements || {}
    const set = config || {}
    const defaults = {
      visibleClass: 'visible',
      bodyClass: null,
      triggerClass: null,
      outerSelector: '.popup-outer',
      closeSelector: '[data-close]',
      autoFocusSelector: '[data-auto-focus]',
      slide: null,
      click: true,
      slideChild: null,
      visible: false,
      beforeShowCallback: null,
      beforeHideCallback: null,
      showCallback: null,
      hideCallback: null,
      error: null,
      target: null
    }
    this.settings = Object.assign(defaults, set)
    if (!this.settings.target) return console.error(`Limelight: no target was provided`)
    this.visible = this.settings.visible
    this.target = this.settings.target
    this.element = document.querySelector(this.target)
    const { element, settings } = this
    const {
      slide,
      slideChild,
      outerSelector,
      hideCallback,
      showCallback,
      beforeHideCallback,
      beforeShowCallback } = settings
    if (!element) return console.error(`${this.target} target not found!`)
    this.outer = element.querySelector(outerSelector)
    if (slide) {
      this.slideElem = slideChild ? element.querySelector(slideChild) : element
    }
    this.hasBeforeShowCallback = beforeShowCallback && typeof beforeShowCallback === 'function'
    this.hasBeforeHideCallback = beforeHideCallback && typeof beforeHideCallback === 'function'
    this.hasShowCallback = showCallback && typeof showCallback === 'function'
    this.hasHideCallback = hideCallback && typeof hideCallback === 'function'
    Limelight.elements[this.target] = this
    this.init()
  }

  escEvent (event) {
    if (event.keyCode === 27) {
      this.element.removeEventListener('keyup', this.escEvent)
      this.hide()
    }
  }

  eventHandler (event, method) {
    event.preventDefault()
    const { target } = event.elem.dataset
    const element = Limelight.elements[target] || new Limelight({ target })
    return method ? element[method]() : element['toggle']()
  }

  init () {
    const { settings, element } = this
    function on (top, eventName, selector, fn) {
      top.addEventListener(eventName, (event) => {
        const possibleTargets = top.querySelectorAll(selector)
        const target = event.target
        for (let i = 0, l = possibleTargets.length; i < l; i++) {
          let el = target
          const p = possibleTargets[i]

          while (el && el !== top) {
            if (el === p) {
              event.preventDefault()
              event.elem = p
              return fn.call(p, event)
            }
            el = el.parentNode
          }
        }
      }, true)
    }

    const trigger = `[data-trigger][data-target="${this.target}"]`
    if (settings.click) {
      on(document.body, 'click', trigger, (e) => this.eventHandler(e))
    }
    if (settings.hover) {
      on(document.body, 'mouseenter', trigger, (e) => this.eventHandler(e, 'show'))
    }
    on(element, 'click', settings.closeSelector, (e) => this.closeEvent(e))
    if (settings.slide) {
      window.addEventListener('resize', this.adjustSlideHeight.bind(this))
    }
  }

  closeEvent (event) {
    const target = this.getTarget(event)
    target ? this.eventHandler(event, target, 'hide') : this.hide()
  }

  getTarget (event) {
    const element = event.elem || event.currentTarget

    if (element.tagName === 'A') {
      event.preventDefault()
      console.warn(`Limelight: It is not recommended to use links as trigger for accessibility reasons.`)
    }

    const selector = element.dataset.target
    const target = selector || null
    return target
  }

  toggleTriggers (method) {
    const { settings, target } = this
    if (settings.triggerClass) {
      const triggerSelector = `[data-trigger][data-target="${target}"]`
      const triggerElements = document.querySelectorAll(triggerSelector)
      for (let elem = 0; elem < triggerElements.length; elem += 1) {
        const tElem = triggerElements[elem]
        if (method === 'on') {
          tElem.classList.add(settings.triggerClass)
        } else {
          tElem.classList.remove(settings.triggerClass)
        }
      }
    }
  }

  isVisible () {
    const { element, visible, settings } = this
    return visible || element.classList.contains(settings.visibleClass)
  }

  show () {
    const { settings, target, element, outer } = this
    const { bodyClass, visibleClass } = settings
    if (this.isVisible()) {
      return this
    }
    if (this.hasBeforeShowCallback) {
      settings.beforeShowCallback(this, Limelight.elements)
    }
    this.visible = true
    if (bodyClass) document.body.classList.add(bodyClass)
    element.classList.add(visibleClass)
    this.slideToggle('down')
    this.toggleTriggers('on')
    const autoFocus = document.querySelector(`${target} ${settings.autoFocusSelector}`)
    if (autoFocus) {
      autoFocus.focus()
    }
    if (outer) {
      outer.addEventListener('click', (e) => this.closeEvent(e))
    }
    element.addEventListener('keyup', (e) => this.escEvent(e))
    if (this.hasShowCallBack) {
      settings.showCallback(this)
    }
    return this
  }

  slideToggle (method) {
    const { settings, slideElem } = this
    if (settings.slide) {
      const el = slideElem
      if (method === 'up') {
        el.style.height = settings.visible ? 0 : null
      } else {
        el.style.height = settings.visible ? null : `${el.scrollHeight}px`
      }
    }
  }

  adjustSlideHeight () {
    if (!this.isVisible()) return
    if (!this.settings.visible) return
    const el = this.slideElem
    el.style.height = `${el.scrollHeight}px`
  }

  hide () {
    const { settings, element, outer } = this
    if (!this.isVisible()) {
      return this
    }
    if (this.hasBeforeHideCallback) {
      settings.beforeHideCallback(this)
    }
    this.visible = false
    if (settings.bodyClass) {
      document.body.classList.remove(settings.bodyClass)
    }
    element.classList.remove(settings.visibleClass)
    this.slideToggle('up')
    this.toggleTriggers('off')
    if (outer) this.outer.removeEventListener('click', (e) => this.closeEvent(e))
    if (this.hasHideCallback) {
      settings.hideCallback(this)
    }
    return this
  }

  toggle () {
    this.isVisible() ? this.hide() : this.show()
    return this
  }
}
