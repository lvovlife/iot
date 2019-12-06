print("Controller started in manual mode");
var position = 0;
var direction = 0; // 1 - down, -1 - up
var minPosition = 0;
var maxPosition = 10;
var manualMode = true; // Стартуем в ручном режиме

// Подключаем сигнальный светодиод
// горит      - ручной режим
// не горит   - дневной режим
// мигает     - ночной режим
var manualModeLed = require('@amperka/led').connect(P13);
manualModeLed.turnOn();

// Подключаем датчик освещенности
var lightSensor = require('@amperka/light-sensor').connect(A0);

// Подключаем мотор
var Motor = require('@amperka/motor');
// Подключаем мотор канала M1 на Motor Shield
var myMotor = Motor.connect(Motor.MotorShield.M1);

// Определяем границы освещенности и порог срабатывания
var hist = require('@amperka/hysteresis').create(
  {
    "low":5,
    "high":8,
    "lowLag": 10,
    "highLag":10
  }
);

var motorOnTimer = require('@amperka/timer').create(1); // создаём таймер, тикающий каждые 5 секунд
// Подписываемся на событие-тик
motorOnTimer.on('tick', function() {
  i = this.interval();
  position = position + direction * i;
  print('Beep', position);
  if ( position === maxPosition || position === minPosition ) {
    motorStop();
  }
});

function motorDown() {
  if ( position === maxPosition ) {
    print('We on bottom!!! Cant run more!!!');
    return 0;
  }
  if (!motorOnTimer.isRunning()) {
    print("Run motor down");
    direction = 1;
    motorOnTimer.run(); // запускаем таймер
  } else {
    print("Timer already run");
  }

  myMotor.write(-0.5);
}

function motorUp() {
  if ( position === minPosition ) {
    print('We on top!!! Cant run more!!!');
    return 0;
  }
  if (!motorOnTimer.isRunning()) {
    print("Run motor up");
    direction = -1;
    motorOnTimer.run(); // запускаем таймер
  } else {
    print("Timer already run");
  }

  myMotor.write(0.5);
}

function motorStop() {
  if (motorOnTimer.isRunning()) {
    print("Stop motor ");
    direction = 0;
    motorOnTimer.stop();
  } else {
    print("Timer not run");
  }

  myMotor.write(0);
}

var receiver = require('@amperka/ir-receiver').connect(P2);

receiver.on('receive', function(code) {
  console.log('REMOTE CODE: ', code);
  // в зависимости от нажатой кнопки пульта
  // даём разные команды роботу
  motorStop();
  if (code === 378101919 && manualMode) {
    console.log('UP!!!');
    motorUp();
  } else if (code === 378124359 && manualMode){
    console.log('DOWN!!!');
    motorDown();
  } else if (code === 378130479) {
    console.log(manualMode ? "Manual mode off" : "Manual mode on");
    manualMode = manualMode ? false : true;
    manualModeLed.toggle();
  }
});

var ledOnAnim = require('@amperka/animation').create({
  from: 0,             // анимация от 0
  to: 1.1,              // до 1.
  duration: 4,          // продолжительностью 2 секунды
  updateInterval: 0.02  // с обновлением каждые 20 мс
});

ledOnAnim.on('update', function(val) {
  console.log('Led brightness:', val, ' from 0 to 1');
  // manualModeLed.brightness(val);
  // manualModeLed.turnOn();
  //myServo.write(val);
});

// выводим в консоль данные с датчика освещённости во всех возможных форматах
setInterval( function() {
  console.log('Current position:', position,
              "Mode:", manualMode ? "MANUAL" : "AUTO",
              "/"+(position?"closed":"opened"),
              (position === minPosition || position === maxPosition) ? "full" : "semi"
             );
  if ( ! manualMode ) {
    hist.push(lightSensor.read('lx'));
    console.log('Room lightness:', lightSensor.read('lx'), 'luxes');
    console.log('Room lightness:', lightSensor.read('V'), 'V');
    console.log('Room lightness:', lightSensor.read('mV'), 'mV');
    console.log('Room lightness:', lightSensor.read(), 'from 0 to 1');
    console.log('---------------');
  }
 },1000);

hist.on('high', function() {
  console.log('HIGH!!!');
  manualModeLed.turnOff();
  motorUp();
});

hist.on('low', function() {
  console.log('LOW!!!');
  ledOnAnim.play();
  manualModeLed.blink(1, 1);
  motorDown();
});
