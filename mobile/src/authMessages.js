export function getLoginErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter a valid work email address.';
    case 'auth/user-disabled':
      return 'This workspace account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network connection lost. Check your internet connection and try again.';
    default:
      return error?.message || 'Unable to sign in right now.';
  }
}

export function getRegisterErrorMessage(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'An IntelliFlow account already exists for this email.';
    case 'auth/invalid-email':
      return 'Enter a valid work email address.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many registration attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network connection lost. Check your internet connection and try again.';
    default:
      return error?.message || 'Unable to create your workspace right now.';
  }
}

export function getResetPasswordErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter a valid work email address.';
    case 'auth/user-not-found':
      return 'No IntelliFlow account was found for this email.';
    case 'auth/too-many-requests':
      return 'Too many recovery attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network connection lost. Check your internet connection and try again.';
    default:
      return error?.message || 'Unable to send a reset link right now.';
  }
}
