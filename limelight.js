/* ===================================================================================== @preserve =

Limelight
version v2.1.17
Author: George Butter
https://github.com/ButsAndCats/limelight
ISC License
================================================================================================= */

/*
  Manages visibility for popups, drawers, modals, notifications, tabs, accordions and anything else.
*/
const Limelight = function LimelightVisibilityManager (target, config) {
  const settings = config || {}

  // The default configuration
  /*
    visibleClass: The class that will be applied to the target element.
    bodyClass: The class that will be applied to the body.
    triggerClass: The class that will be applied to the trigger that is clicked on.
    detach: if the body should be appended to the body.
    outerSelector: The outer area of the element, acts like a close button when clicked.
    autoFocusSelector: An input field that you would like to be focused with the element opens.
    slide: Whether the opening should be animated with javascript, useful for accordions.
    slideSpeed: Speed of the animation, can be defined in px per ms.
    slideChild: Selector of the child element to slide instead of the parent.
    visible: Whether the element was loaded visible or not.
    success: Callback for when an element is success fully made visible.
    error: Callback fro when an element could not be made visible.
  */
  const defaultSettings = {
    visibleClass: 'visible',
    bodyClass: 'active-popup',
    triggerClass: null,
    detach: null,
    outerSelector: '.popup-outer',
    autoFocusSelector: '[data-auto-focus]',
    slide: null,
    slideSpeed: 10,
    slideChild: null,
    visible: false,
    beforeShowCallback: null,
    beforeHideCallback: null,
    showCallback: null,
    hideCallback: null,
    error: null,
    group: null
  }

  // Merge configs
  this.settings = Object.assign(defaultSettings, settings)

  // Update current popup config
  this.visible = this.settings.visible
  // The Dom element of the popup

  this.element = document.querySelector(target)
  this.outerElement = this.element.querySelector(`${this.settings.outerSelector}`)
  this.closeElement = document.querySelector(`${target} [data-close]`)
  this.target = target

  if (this.settings.slide) {
    if (this.settings.slideChild) {
      this.slideElement = this.element.querySelector(this.settings.slideChild)
    } else {
      this.slideElement = this.element
    }
    const defaultDisplay = this.slideElement.style.display
    this.slideElement.style.display = 'block'
    this.maxHeight = this.slideElement.offsetHeight
    this.slideElement.style.display = defaultDisplay
    this.height = this.slideElement.offsetHeight
    this.counter = this.height
  }

  // Bind this into all of our prototype functions
  this.show = this.show.bind(this)
  this.hide = this.hide.bind(this)
  this.toggle = this.toggle.bind(this)
  this.detach = this.detach.bind(this)
  this.slideDown = this.slideDown.bind(this)
  this.slideUp = this.slideUp.bind(this)
  this.buildEventListeners = this.buildEventListeners.bind(this)
  this.eventHandler = this.eventHandler.bind(this)

  // If detach is set to true move the popup to the end of the popup
  if (this.settings.detach) {
    document.addEventListener('DOMContentLoaded', this.detach)
  }

  // Create a list of all of the currently active elements so that we can access them globally
  Limelight.elements[target] = this
  this.buildEventListeners()
}

// Create an empty object to store all of the elements in.
Limelight.elements = Limelight.elements || {}

// Prevent default if the element is a link and return the selector of the popup element
Limelight.getTarget = function getTheLimelightElementRelatedToTheTarget (event) {
  const element = event.currentTarget
  if (element.tagName === 'A') {
    event.preventDefault()
  }
  const selector = element.dataset.target
  const target = selector || null
  return target
}

/*
  If the element does not exist then it is being fired directly from a data attribute.
  Therefore we create a new Limelight element. Then we toggle the elements visibility.
*/
Limelight.prototype.eventHandler = function hideOrShowTheElement (event, target, method) {
  let element = Limelight.elements[target]
  if (!element) {
    element = new Limelight(target)
  }
  if (method === 'hide') {
    return element.hide()
  }
  if (method === 'show') {
    return element.show()
  }
  return element.toggle()
}
/*
  When clicking on a close button or out element
*/
Limelight.closeEvent = function handleAnElementBeingClosed (event) {
  const target = Limelight.getTarget(event)
  if (target) {
    this.eventHandler(event, target, 'hide')
  } else {
    this.hide()
  }
}

/*
  On key up event check if the user has pressed escape
*/
Limelight.escEvent = function onKeyUpEscape (event) {
  if (event.keyCode === 27) {
    this.element.removeEventListener('keyup', Limelight.escEvent)
    this.hide()
  }
}

/*
  Build the event listeners
*/
Limelight.prototype.buildEventListeners = function bindLimelightEventListeners () {
  const allTriggers = document.querySelectorAll(`[data-trigger][data-target="${this.target}"]`)
  const clickFunction = function (event) {
    event.preventDefault()
    event.stopPropagation()
    this.triggerElement = event.currentTarget
    const { target } = this.triggerElement.dataset
    this.eventHandler(event, target)

  }.bind(this)
  const hoverFunction = function (event) {
    event.preventDefault()
    event.stopPropagation()
    const { target } = event.currentTarget.dataset
    this.eventHandler(event, target, 'show')
  }.bind(this)
  for (let trigger = 0; trigger < allTriggers.length; trigger += 1) {
    allTriggers[trigger].addEventListener('click', clickFunction)
    if (this.settings.hover) {
      allTriggers[trigger].addEventListener('mouseenter', hoverFunction)
    }
  }
}

/*
  Add a class to a given element
*/
Limelight.addClass = function addAClassToAGivenElement (element, className) {
  const el = element
  if (el.classList) {
    el.classList.add(className)
  }
}

/*
  Remove a class from a given element
*/
Limelight.removeClass = function removeAClassFromAGivenElement (element, className) {
  const el = element
  if (el.classList) {
    el.classList.remove(className)
  }
}

/*
  Show the popup element
*/
Limelight.prototype.show = function showTheElement () {
  // Check if the element is visible or not.
  if (!this.visible || !this.element.classList.contains(this.settings.visibleClass)) {
    // Fire the before show callback
    if (this.settings.beforeShowCallback && typeof this.settings.beforeShowCallback === 'function') {
      this.settings.beforeShowCallback(this, Limelight.elements)
    }
    // Add the class to the trigger button if one is defined.
    if (this.settings.triggerClass) {
      const triggerElement = document.querySelector(`[data-target="${this.target}"]`)
      Limelight.addClass(triggerElement, this.settings.triggerClass)
    }
    // If slide is set to true slide the element down.
    if (this.settings.slide) {
      this.slideDown(this.settings.slideDuration)
    }
    // Add the visible class to the popup
    Limelight.addClass(this.element, this.settings.visibleClass)
    // Add the body class to the body
    Limelight.addClass(document.body, this.settings.bodyClass)
    // Define that this element is visible
    this.visible = true

    // Focus on an input field once the modal has opened
    const focusEl = document.querySelector(`${this.target} ${this.settings.autoFocusSelector}`)
    if (focusEl) {
      setTimeout(() => {
        focusEl.focus()
      }, 300)
    }
    if (this.closeElement) {
      // When someone clicks the [data-close] button then we should close the modal
      this.closeElement.addEventListener('click', Limelight.closeEvent.bind(this))
    }
    if (this.outerElement) {
      // When someone clicks on the inner class hide the popup
      this.outerElement.addEventListener('click', Limelight.closeEvent.bind(this))
    }
    // When someone presses esc hide the popup and unbind the event listener
    this.element.addEventListener('keyup', Limelight.escEvent.bind(this))

    // Fire the success callback
    if (this.settings.showCallback && typeof this.settings.showCallback === 'function') {
      this.settings.showCallback(this, Limelight.elements)
    }
  } else if (this.settings.error && typeof this.settings.error === 'function') {
    this.settings.error('Limelight: Error this element is already visible', this)
  }
  // Return this so that we can chain functions together
  return this
}

Limelight.prototype.slideDown = function slideDown () {
  clearInterval(this.upInterval)
  const el = this.slideElement
  // Display none
  const defaultDisplay = this.slideElement.style.display

  el.style.display = 'block'
  el.style.overflow = 'visible'
  el.style.maxHeight = '100%'
  // Declare the value of "height" variable
  this.maxHeight = el.offsetHeight
  el.style.display = defaultDisplay
  this.height = el.offsetHeight
  // Declare the value of "counter" variable
  this.counter = this.height
  el.style.maxHeight = `${this.height}px`
  el.style.overflow = 'hidden'
  el.style.display = 'block'

  const adder = this.settings.slideSpeed
  // Iteratively increase the height

  this.downInterval = setInterval(() => {
    this.counter += adder
    if (this.counter < this.maxHeight) {
      el.style.maxHeight = `${this.counter}px`
    } else {
      el.style.maxHeight = null
      el.style.overflow = null
      this.height = this.slideElement.offsetHeight
      clearInterval(this.downInterval)
    }
  }, 1)
}

Limelight.prototype.slideUp = function slideUp () {
  clearInterval(this.downInterval)
  const el = this.slideElement
  const subtractor = this.settings.slideSpeed
  // To hide the content of the element
  el.style.overflow = 'hidden'

  // Decreasing the height
  this.upInterval = setInterval(() => {
    this.counter -= subtractor
    if (this.counter > 0) {
      el.style.maxHeight = `${this.counter}px`
    } else {
      el.style.maxHeight = null
      el.style.display = 'none'
      el.style.overflow = null
      clearInterval(this.upInterval)
    }
  }, 1)
}

Limelight.prototype.hide = function hideTheElement () {
  if (this.visible || this.element.classList.contains(this.settings.visibleClass)) {
    // Fire the before hide callback
    if (this.settings.beforeHideCallback && typeof this.settings.beforeHideCallback === 'function') {
      this.settings.beforeHideCallback(this, Limelight.elements)
    }

    this.visible = false

    Limelight.removeClass(document.body, this.settings.bodyClass)

    Limelight.removeClass(this.element, this.settings.visibleClass)

    if (this.settings.slide) {
      this.slideUp(this.settings.slideDuration)
    }

    if (this.settings.triggerClass) {
      const triggerElement = document.querySelector(`[data-target="${this.target}"]`)
      Limelight.removeClass(triggerElement, this.settings.triggerClass)
    }

    if (this.closeElement) {
      // When someone clicks the [data-close] button then we should close the modal
      this.closeElement.removeEventListener('click', Limelight.closeEvent.bind(this))
    }
    if (this.outerElement) {
      // When someone clicks on the inner class hide the popup
      this.outerElement.removeEventListener('click', Limelight.closeEvent.bind(this))
    }

    // Fire the success callback
    if (this.settings.hideCallback && typeof this.settings.hideCallback === 'function') {
      this.settings.hideCallback(this, Limelight.elements)
    }
  } else if (this.settings.error && typeof this.settings.error === 'function') {
    this.settings.error('Limelight: Error this element is already hidden', this)
  }
  return this
}

/*
  Show if hidden, hide if shown.
*/
Limelight.prototype.toggle = function toggleLimelightVisibility () {
  if (this.visible) {
    this.hide()
  } else {
    this.show()
  }
  return this
}

/*
  Move the element to the end of the body, sometime useful for popups.
*/
Limelight.prototype.detach = function moveTheElementToTheEndOfTheBody () {
  document.body.appendChild(this.element)
  return this
}

export default Limelight
