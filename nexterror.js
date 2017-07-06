var errorcount = 0;
var failurecount = 0;
var warningcount = 0;

function doParse() {
  var next_error = 1;
  var next_warning = 1;
  var next_failure = 1;
  // When using logdog, the errors are in individual divs under the "logs" div.
  var logs = document.getElementById('logs');
  var divs = logs.getElementsByClassName(
    "log-entry-chunk style-scope logdog-stream-view");
  // GCC errors look like this:
  // /.../dtoa/dtoa.c:2550: warning: comparison between signed and unsigned
  var kGCCErrorRE = new RegExp('^[^ :]+:\\d+: ', 'gm');
  var kPathRE = new RegExp('^/b/slave/(mac|linux|linux_view)/build/src/(.*)$', 'gm');
  var kPathWinRE = new RegExp('[a-zA-Z]:\\\\b\\\\slave\\\\([^\\\\]*)\\\\build\\\\src\\\\(.*)$', 'gm');
  var kMakeRE = new RegExp('^(make: \\*\\*\\* .* Error.*)', 'gm');
  for (var i = 0; i < divs.length; ++i) {
    var div = divs[i];
    if (div.innerHTML.match('error:') ||  // Mac style.
        div.innerHTML.match('error (C|LNK)[0-9][0-9][0-9][0-9]') ||  // Windows style.
        div.innerHTML.match(kGCCErrorRE) ||
        div.innerHTML.match('\[\ \ FAILED\ \ \]')) {
      // Clean up file paths pointing to the trybot file system.
      div.innerHTML = div.innerHTML.replace(kPathRE, '...<b>$2</b>');
      div.innerHTML = div.innerHTML.replace(kPathWinRE, '...<b>$2</b>');
      // Loop over the div adding an anchor for each error, failure, and
      // warning, and highlight the text.
      while (true) {
        // Don't use createElement/insertBefore because the error message could
        // be in the middle of a large div, and we want the anchor right where
        // the error is.
        var length = div.innerHTML.length;
        // We insert an anchor before the error message and if we don't exclude
        // errors/warnings with </a> in front this will loop forever, trying to
        // insert the anchor tag. Hence the [^>] at the front of the regexp.
        div.innerHTML = div.innerHTML.replace(
            /[^>](error:|error (C|LNK)[0-9][0-9][0-9][0-9])/,
            '<a name=error' + next_error + '></a>' +
                '<b><font color=red>$1</font></b>');
        if (div.innerHTML.length != length) {
          ++next_error;
          continue;
        }

        // Check for warnings.
        div.innerHTML = div.innerHTML.replace(/[^>](warning:)/,
                                                '<a name=warning' + next_warning + '></a>' +
                                                '<b><font color=red>$1</font></b>');
        if (div.innerHTML.length != length) {
          ++next_warning;
          continue;
        }

        // Check for unit test failures.
        div.innerHTML = div.innerHTML.replace(
            /[^>]\[  FAILED  \]/,
            '\r<a name=failure' + next_failure + '></a>' +
                '<b><font color=red>[  FAILED  ]</font></b>');
        if (div.innerHTML.length != length) {
          ++next_failure;
          continue;
        }

        // If we get here, there's nothing left to replace.
        break;
      }
    }
    // Look for make system errors.
    if (div.innerHTML.match(kMakeRE)) {
      div.innerHTML = div.innerHTML.replace(kPathWinRE, '...<b>$2</b>');
      while (true) {
        var length = div.innerHTML.length;
        div.innerHTML = div.innerHTML.replace(kMakeRE,
                                                '<a name=error' + next_error + '></a>' +
                                                '<b><font color=red>$1</font></b>');
        if (div.innerHTML.length != length) {
          ++next_error;
          continue;
        }
        break;
      }
    }
  }
  errorcount = next_error - 1;
  failurecount = next_failure - 1;
  warningcount = next_warning - 1;

  if (errorcount == 0)
    document.getElementById('nextErrorButton').value = "no errors";
  if (warningcount == 0)
    document.getElementById('nextWarningButton').value = "no warnings";
  if (failurecount == 0)
    document.getElementById('nextFailureButton').value = "no faliures";
}

function currentErrorIndex() {
  var hash = document.location.hash;
  if (!hash)
    return 0;
  else
    return parseInt(hash.substr('#error'.length));
}

// Returns the one-based index of current faliure.
function currentFailureIndex() {
  var hash = document.location.hash;
  if (!hash)
    return 0;
  else
    return parseInt(hash.substr('#failure'.length));
}

// Returns the one-based index of current warning.
function currentWarningIndex() {
  var hash = document.location.hash;
  if (!hash)
    return 0;
  else
    return parseInt(hash.substr('#warning'.length));
}

function errorButtonLabel(index) {
  if (errorcount == 0)
    return 'Find Errors';
  else if (index == 0)
    return 'Next error (' + errorcount + ' found)';
  else
    return 'Error ' + index + '/' + errorcount;
}

function failureButtonLabel(index) {
  if (failurecount == 0)
    return 'Find Failures';
  else if (index == 0)
    return 'Next failure (' + failurecount + ' found)';
  else
    return 'Failure ' + index + '/' + failurecount;
}

function warningButtonLabel(index) {
  if (warningcount == 0)
    return 'Find Warnings';
  else if (index == 0)
    return 'Next warning (' + warningcount + ' found)';
  else
    return 'Warning ' + index + '/' + warningcount;
}

function nextError() {
  if (errorcount == 0 && failurecount == 0 && warningcount == 0)
    doParse();
  var index = currentErrorIndex();
  if (++index > errorcount || isNaN(index))
    index = 1;
  document.location.hash = 'error' + index;
  document.getElementById('nextErrorButton').value = errorButtonLabel(index);
  if (errorcount == 0)
    document.getElementById('nextErrorButton').value = "no errors";
}

function nextFailure() {
  if (errorcount == 0 && failurecount == 0 && warningcount == 0)
    doParse();
  var index = currentFailureIndex();
  if (++index > failurecount || isNaN(index))
    index = 1;
  document.location.hash = 'failure' + index;
  document.getElementById('nextFailureButton').value = failureButtonLabel(index);
  if (failurecount == 0)
    document.getElementById('nextFailureButton').value = "no faliures";
}

function nextWarning() {
  if (errorcount == 0 && failurecount == 0 && warningcount == 0)
    doParse();
  var index = currentWarningIndex();
  if (++index > warningcount || isNaN(index))
    index = 1;
  document.location.hash = 'warning' + index;
  document.getElementById('nextWarningButton').value = warningButtonLabel(index);
  if (warningcount == 0)
    document.getElementById('nextWarningButton').value = "no warnings";
}

function createButton(id, label, handler) {
  var button = document.createElement('input');
  button.id = id;
  button.type = 'submit';
  button.value = label;
  button.style.cssFloat = 'right';
  button.onclick = handler;
  return button;
}

// TODO: We need to wait until the logs are loaded before parsing.
// Currently we wait for a button press, can we catch an event intstead?
// div id status-bar hidden?  class "style-scope logdog-stream-view" hidden?
// doParse();

var span = document.createElement('span');
span.style.position = 'fixed';
span.style.right = 0;
span.style.top = 0;

span.appendChild(createButton('nextFailureButton',
                              failureButtonLabel(currentFailureIndex()),
                              nextFailure));
span.appendChild(createButton('nextWarningButton',
                              warningButtonLabel(currentWarningIndex()),
                              nextWarning));
span.appendChild(createButton('nextErrorButton',
                              errorButtonLabel(currentErrorIndex()),
                              nextError));
document.body.appendChild(span);

