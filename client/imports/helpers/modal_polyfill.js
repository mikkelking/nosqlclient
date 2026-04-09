import $ from 'jquery';

// Minimal bootstrap-like modal behavior: show/hide with backdrop and body lock.
const toggleBodyLock = (lock) => {
  if (lock) $('body').addClass('modal-open');
  else $('body').removeClass('modal-open');
};

const showModal = ($el) => {
  if ($el.data('backdrop')) return; // already visible

  const $backdrop = $('<div class="modal-backdrop fade in"></div>');
  $('body').append($backdrop);
  $el.data('backdrop', $backdrop);

  $el.show().addClass('in');
  toggleBodyLock(true);
};

const hideModal = ($el) => {
  const $backdrop = $el.data('backdrop');
  if ($backdrop) {
    $backdrop.remove();
    $el.removeData('backdrop');
  }
  $el.hide().removeClass('in');
  toggleBodyLock(false);
};

$.fn.modal = function modal(action = 'show') {
  return this.each(function modalEach() {
    const $el = $(this);
    if (action === 'show' || action === 'toggle') {
      if (action === 'toggle' && $el.is(':visible')) hideModal($el);
      else showModal($el);
    } else if (action === 'hide') {
      hideModal($el);
    }
  });
};

// Close modals when a data-dismiss="modal" element is clicked.
$(document).on('click', '[data-dismiss="modal"]', (event) => {
  const $trigger = $(event.currentTarget);
  const $modal = $trigger.closest('.modal');
  hideModal($modal);
});

// Open modals via data-toggle/data-target attributes.
$(document).on('click', '[data-toggle="modal"]', (event) => {
  const $trigger = $(event.currentTarget);
  const target = $trigger.data('target');
  if (target) {
    event.preventDefault();
    $(target).modal('show');
  }
});
