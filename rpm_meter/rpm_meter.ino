/*
 * RPM Meter using a Push Button as a Manual Encoder
 * --------------------------------------------------
 * 1 button press  = 1 rotation.
 *
 * Techniques used:
 *   - External hardware interrupt (INT0 on pin 2) to count presses.
 *   - Software debouncing inside the ISR using micros().
 *   - Internal Timer1 in CTC mode to create a precise 1-second
 *     measurement window (no delay() in the main loop).
 *   - RPM printed to the Serial Monitor (works in Tinkercad).
 *
 * Wiring (Arduino Uno in Tinkercad):
 *   - Push button: one leg to pin 2, the opposite leg to GND.
 *     The internal pull-up is enabled, so no external resistor is
 *     needed. The pin idles HIGH and is pulled LOW when pressed.
 *
 *   Pin 2  o---[ button ]---o GND
 *
 * Open the Serial Monitor at 9600 baud to read the RPM.
 */

// ---------------------- Configuration -------------------------------
const uint8_t  BUTTON_PIN      = 2;      // Must be 2 or 3 on the Uno (INT0/INT1)
const uint32_t DEBOUNCE_US     = 8000UL; // Ignore edges closer than 8 ms apart
const uint16_t WINDOW_MS       = 1000;   // Measurement window length (1 second)

// ---------------------- Shared state --------------------------------
// Variables touched by both an ISR and the main code must be volatile.
volatile uint32_t pulseCount      = 0;   // Presses counted in the current window
volatile uint32_t lastEdgeMicros  = 0;   // Time of the last accepted press (debounce)
volatile bool     windowElapsed   = false; // Set by Timer1 every WINDOW_MS
volatile uint32_t pulsesThisWindow = 0;  // Snapshot of pulseCount for the loop

// --------------------------------------------------------------------
// Button ISR: runs on each falling edge (press). Debounced in software.
// --------------------------------------------------------------------
void countPress() {
  uint32_t now = micros();
  if (now - lastEdgeMicros >= DEBOUNCE_US) {
    pulseCount++;
    lastEdgeMicros = now;
  }
}

// --------------------------------------------------------------------
// Timer1 setup: CTC mode, fires an interrupt once every WINDOW_MS.
//   16 MHz / 256 prescaler = 62500 ticks per second.
//   For 1000 ms window: compare value = 62500 - 1 = 62499.
// --------------------------------------------------------------------
void setupTimer1(uint16_t windowMs) {
  noInterrupts();
  TCCR1A = 0;                      // Normal port operation, CTC via TCCR1B
  TCCR1B = 0;
  TCNT1  = 0;                      // Reset counter

  // ticks = (F_CPU / prescaler) * (windowMs / 1000) - 1
  // With prescaler 256: 62500 ticks = 1 s.
  uint32_t ticks = ((uint32_t)62500 * windowMs) / 1000UL - 1UL;
  OCR1A = (uint16_t)ticks;         // Compare match value (max 65535)

  TCCR1B |= (1 << WGM12);          // CTC mode (clear timer on compare match)
  TCCR1B |= (1 << CS12);           // Prescaler = 256
  TIMSK1 |= (1 << OCIE1A);         // Enable compare-match A interrupt
  interrupts();
}

// --------------------------------------------------------------------
// Timer1 compare-match ISR: end of a measurement window.
// Snapshot and clear the press counter, then flag the main loop.
// --------------------------------------------------------------------
ISR(TIMER1_COMPA_vect) {
  pulsesThisWindow = pulseCount;
  pulseCount       = 0;
  windowElapsed    = true;
}

// --------------------------------------------------------------------
void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Falling edge = button pressed (pin pulled from HIGH to LOW).
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), countPress, FALLING);

  setupTimer1(WINDOW_MS);

  Serial.println(F("RPM Meter ready - press the button (1 press = 1 rotation)"));
  Serial.println(F("RPM"));
}

// --------------------------------------------------------------------
void loop() {
  if (windowElapsed) {
    // Read shared variables safely (briefly disable interrupts).
    noInterrupts();
    uint32_t pulses = pulsesThisWindow;
    windowElapsed   = false;
    interrupts();

    // RPM = rotations per window scaled to one minute.
    //   60000 ms / WINDOW_MS = number of windows per minute.
    uint32_t rpm = pulses * (60000UL / WINDOW_MS);

    Serial.println(rpm);
  }

  // The main loop stays free for other work; all timing is interrupt-driven.
}
