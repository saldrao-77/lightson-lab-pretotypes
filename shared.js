/**
 * Idea Lab shared form helpers
 *
 * Set your form endpoint when ready:
 *   - FormSubmit:  'https://formsubmit.co/ajax/you@example.com'
 *   - Formspree:   'https://formspree.io/f/xxxxxxxx'
 * Leave empty for demo mode (localStorage + on-page success).
 */
window.IDEA_LAB_FORM_ENDPOINT = 'https://formsubmit.co/ajax/lightsonlab@agentmail.to';

(function () {
  var STORAGE_KEY = 'idea_lab_signups';

  function qs(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || '';
    } catch (e) {
      return '';
    }
  }

  function fillHidden(form) {
    var map = {
      utm_source: qs('utm_source'),
      utm_medium: qs('utm_medium'),
      utm_campaign: qs('utm_campaign'),
      utm_content: qs('utm_content'),
      utm_term: qs('utm_term'),
      referrer: document.referrer || '',
      page: window.location.pathname || '',
      idea: form.getAttribute('data-idea') || '',
      submitted_at: new Date().toISOString()
    };
    Object.keys(map).forEach(function (key) {
      var el = form.querySelector('[name="' + key + '"]');
      if (el) el.value = map[key];
    });
  }

  function formToObject(form) {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (value instanceof File) {
        if (value.name) data[key] = value.name + ' (' + value.size + ' bytes)';
        return;
      }
      data[key] = value;
    });
    return data;
  }

  function loadSignups() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveSignup(obj) {
    var list = loadSignups();
    list.push(obj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  }

  function showSuccess(form, demo) {
    var success = form.parentElement.querySelector('.success') ||
                  document.querySelector('.success');
    if (success) {
      success.classList.add('show');
      var note = success.querySelector('.demo-note');
      if (note) note.style.display = demo ? 'block' : 'none';
    }
    form.style.display = 'none';
  }

  function wireForms() {
    var forms = document.querySelectorAll('form[data-idea]');
    forms.forEach(function (form) {
      fillHidden(form);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        fillHidden(form);

        var btn = form.querySelector('[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.dataset.orig = btn.textContent;
          btn.textContent = 'Sending…';
        }

        var payload = formToObject(form);
        var endpoint = window.IDEA_LAB_FORM_ENDPOINT || '';

        function finishDemo() {
          saveSignup(payload);
          showSuccess(form, true);
        }

        function resetBtn() {
          if (btn) {
            btn.disabled = false;
            btn.textContent = btn.dataset.orig || 'Join early access';
          }
        }

        if (!endpoint || endpoint.indexOf('REPLACE_EMAIL') !== -1) {
          finishDemo();
          return;
        }

        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            if (!res.ok) throw new Error('submit failed');
            // Still keep a local copy for admin.html counting
            saveSignup(payload);
            showSuccess(form, false);
          })
          .catch(function () {
            // Network / endpoint failure → fall back to demo store
            finishDemo();
          });
      });
    });
  }

  // Admin helpers exported
  window.IdeaLab = {
    STORAGE_KEY: STORAGE_KEY,
    loadSignups: loadSignups,
    clearSignups: function () {
      localStorage.removeItem(STORAGE_KEY);
    },
    exportSignups: function () {
      var blob = new Blob([JSON.stringify(loadSignups(), null, 2)], {
        type: 'application/json'
      });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'idea-lab-signups-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireForms);
  } else {
    wireForms();
  }
})();
