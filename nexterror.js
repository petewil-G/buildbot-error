var errorCount = 0;
var failureCount = 0;
var warningCount = 0;

// One based index of the next item to jump to.
var errorIndex = 0;
var failureIndex = 0;
var warningIndex = 0;

function doParse() {
  var nextError = 1;
  var nextWarning = 1;
  var nextFailure = 1;
  // When using logdog, the errors are in individual divs under the "logs" div.
  var logs = document.getElementById('logs');
  var divs = logs.getElementsByClassName(
    'log-entry-chunk style-scope logdog-stream-view');
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
            '<a name=error' + nextError + '></a>' +
                '<b><font color=red>$1</font></b>');
        if (div.innerHTML.length != length) {
          ++nextError;
          continue;
        }

        // Check for warnings.
        div.innerHTML = div.innerHTML.replace(/[^>](warning:)/,
                                                '<a name=warning' + nextWarning + '></a>' +
                                                '<b><font color=red>$1</font></b>');
        if (div.innerHTML.length != length) {
          ++nextWarning;
          continue;
        }

        // Check for unit test failures.
        div.innerHTML = div.innerHTML.replace(
            /[^>]\[  FAILED  \]/,
            '\r<a name=failure' + nextFailure + '></a>' +
                '<b><font color=red>[  FAILED  ]</font></b>');
        if (div.innerHTML.length != length) {
          ++nextFailure;
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
                                                '<a name=error' + nextError + '></a>' +
                                                '<b><font color=red>$1</font></b>');
        if (div.innerHTML.length != length) {
          ++nextError;
          continue;
        }
        break;
      }
    }
  }
  // Set the global found counts for each type of problem.
  errorCount = nextError - 1;
  failureCount = nextFailure - 1;
  warningCount = nextWarning - 1;

  // Adjust the button text to reflect findings.
  document.getElementById('nextErrorButton').value = errorButtonLabel();
  document.getElementById('nextWarningButton').value = warningButtonLabel();
  document.getElementById('nextFailureButton').value = failureButtonLabel();
}

function errorButtonLabel() {
  if (errorCount == 0)
    return 'no errors';
  else if (errorIndex == 0)
    return 'Next error (' + errorCount + ' found)';
  else
    return 'Error ' + errorIndex + '/' + errorCount;
}

function failureButtonLabel() {
  if (failureCount == 0)
    return 'no failures';
  else if (failureIndex == 0)
    return 'Next failure (' + failureCount + ' found)';
  else
    return 'Failure ' + failureIndex + '/' + failureCount;
}

function warningButtonLabel() {
  if (warningCount == 0)
    return 'no warnings';
  else if (warningIndex == 0)
    return 'Next warning (' + warningCount + ' found)';
  else
    return 'Warning ' + warningIndex + '/' + warningCount;
}

function nextError() {
  if (errorCount == 0 && failureCount == 0 && warningCount == 0)
    doParse();
  if (++errorIndex > errorCount)
    errorIndex = 1;
  document.location.hash = 'error' + errorIndex;
  document.getElementById('nextErrorButton').value = errorButtonLabel();
}

function nextFailure() {
  if (errorCount == 0 && failureCount == 0 && warningCount == 0)
    doParse();
  if (++failureIndex > failureCount)
    failureIndex = 1;
  document.location.hash = 'failure' + failureIndex;
  document.getElementById('nextFailureButton').value = failureButtonLabel();
}

function nextWarning() {
  if (errorCount == 0 && failureCount == 0 && warningCount == 0)
    doParse();
  if (++warningIndex > warningCount)
    warningIndex = 1;
  document.location.hash = 'warning' + warningIndex;
  document.getElementById('nextWarningButton').value = warningButtonLabel();
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
                              'Find failures',
                              nextFailure));
span.appendChild(createButton('nextWarningButton',
                              'Find warnings',
                              nextWarning));
span.appendChild(createButton('nextErrorButton',
                              'Find errors',
                              nextError));
document.body.appendChild(span);

