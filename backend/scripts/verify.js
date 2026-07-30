const { validateTransition } = require('../utils/stateMachine');
const bcrypt = require('bcryptjs');

const runVerification = async () => {
  console.log('=== Running Mini Case Tracker Backend Unit Verifications ===\n');

  let failedTests = 0;
  let passedTests = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedTests++;
    }
  };

  // 1. Test state transitions
  console.log('--- Testing Status Transition State Machine Rules ---');

  // New -> Assigned by Manager
  assert(
    validateTransition('New', 'Assigned', 'Manager').isValid === true,
    'Manager can transition case from New to Assigned'
  );

  // New -> Assigned by Agent (should fail)
  assert(
    validateTransition('New', 'Assigned', 'Agent').isValid === false,
    'Agent CANNOT transition case from New to Assigned'
  );

  // Assigned -> In Progress by Agent
  assert(
    validateTransition('Assigned', 'In Progress', 'Agent').isValid === true,
    'Agent can transition case from Assigned to In Progress'
  );

  // In Progress -> Submitted by Agent
  assert(
    validateTransition('In Progress', 'Submitted', 'Agent').isValid === true,
    'Agent can transition case from In Progress to Submitted'
  );

  // Submitted -> Cleared by Manager
  assert(
    validateTransition('Submitted', 'Cleared', 'Manager').isValid === true,
    'Manager can transition case from Submitted to Cleared'
  );

  // Submitted -> Discrepant by Manager
  assert(
    validateTransition('Submitted', 'Discrepant', 'Manager').isValid === true,
    'Manager can transition case from Submitted to Discrepant'
  );

  // Discrepant -> In Progress by Agent
  assert(
    validateTransition('Discrepant', 'In Progress', 'Agent').isValid === true,
    'Agent can transition case from Discrepant back to In Progress'
  );

  // Invalid transition: New -> Submitted
  assert(
    validateTransition('New', 'Submitted', 'Manager').isValid === false,
    'Manager CANNOT skip states (New -> Submitted is disallowed)'
  );

  // Invalid transition: Cleared -> In Progress
  assert(
    validateTransition('Cleared', 'In Progress', 'Agent').isValid === false,
    'Agent CANNOT transition case out of a terminal state (Cleared)'
  );

  console.log('\n--- Testing Password Hashing Mechanics ---');
  // 2. Test password hash verification helper
  try {
    const rawPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert(isMatch === true, 'Bcrypt successfully hashes and verifies password matches');

    const isNotMatch = await bcrypt.compare('wrongpassword', hash);
    assert(isNotMatch === false, 'Bcrypt successfully rejects incorrect passwords');
  } catch (error) {
    console.error('Password hashing test error:', error);
    failedTests++;
  }

  console.log(`\nVerification complete. Passed: ${passedTests}, Failed: ${failedTests}`);
  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runVerification();
