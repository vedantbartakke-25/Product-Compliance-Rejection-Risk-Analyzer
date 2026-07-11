const { resolveIngredient } = require('./src/services/normalizationService');

async function runTests() {
  console.log('🧪 Testing Normalization Engine...\n');

  const testCases = [
    "Lye",              // Alias
    "Sodium Hydroxide", // Official Name
    "1310-73-2",        // CAS Number
    "TFM",              // Parameter Alias
    "Unicorn Dust"      // Non-existent substance
  ];

  for (const input of testCases) {
    const result = await resolveIngredient(input);
    
    if (result) {
      console.log(`✅ '${input}' \t-> Resolved to: [${result.reference_code}] ${result.official_name}`);
    } else {
      console.log(`❌ '${input}' \t-> Unknown Ingredient (Correct behavior for invalid data)`);
    }
  }

  process.exit(0);
}

runTests();
