const ALLOWED_TRANSITIONS = {
  New: {
    next: ['Assigned'],
    roles: ['Manager'],
  },
  Assigned: {
    next: ['In Progress'],
    roles: ['Agent', 'Manager'], // Allow Agent to start, or Manager for override
  },
  'In Progress': {
    next: ['Submitted'],
    roles: ['Agent'], // Agent submits their work
  },
  Submitted: {
    next: ['Cleared', 'Discrepant'],
    roles: ['Manager'], // Manager reviews and decides
  },
  Discrepant: {
    next: ['In Progress'],
    roles: ['Agent', 'Manager'], // Agent resumes work, or Manager overrides
  },
  Cleared: {
    next: [], // Terminal state
    roles: [],
  },
};

/**
 * Validates whether a status transition is permitted.
 * @param {string} currentStatus - The current status of the case.
 * @param {string} newStatus - The target status.
 * @param {string} userRole - The role of the user requesting the change ('Manager' or 'Agent').
 * @returns {object} { isValid: boolean, error?: string }
 */
const validateTransition = (currentStatus, newStatus, userRole) => {
  // If transitioning to the same status, it's invalid/redundant
  if (currentStatus === newStatus) {
    return { isValid: false, error: `Case is already in state '${newStatus}'.` };
  }

  const rules = ALLOWED_TRANSITIONS[currentStatus];
  if (!rules) {
    return { isValid: false, error: `Invalid current status: '${currentStatus}'.` };
  }

  if (!rules.next.includes(newStatus)) {
    return {
      isValid: false,
      error: `Cannot transition case directly from '${currentStatus}' to '${newStatus}'. Allowed next states: ${rules.next.join(', ') || 'None'}.`,
    };
  }

  if (!rules.roles.includes(userRole)) {
    return {
      isValid: false,
      error: `Role '${userRole}' is not authorized to transition case from '${currentStatus}' to '${newStatus}'.`,
    };
  }

  return { isValid: true };
};

module.exports = {
  validateTransition,
  ALLOWED_TRANSITIONS,
};
