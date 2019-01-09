
const RESET_COLOR = '\x1b[0m';
const GREEN_COLOR = '\x1b[32m';
const BLUE_COLOR = '\x1b[34m';
const LIGHT_RED_COLOR = '\x1b[91m';

function cmdStart(cmd) {
    console.info(`\n${new Date().toISOString()} - ${cmd}`);
    return {
        cmd,
        time: startChrono()
    }
}

function cmdSuccess(state) {
    console.info(`${GREEN_COLOR}${new Date().toISOString()} - ${state.cmd} succeeded in ${stopChrono(state.time)}.${RESET_COLOR}`);
}

function success(msg) {
    console.info(`\n${GREEN_COLOR}${msg}${RESET_COLOR}`);
}

function info(msg) {
    console.info(`${new Date().toISOString()} - ${msg}`);
}

function startChrono() {
    return new Date().getTime();
}

function stopChrono(start) {
    return Math.round((new Date().getTime() - start) / 1000) + ' sec'
}

function error(msg, error) {
    console.error(`${LIGHT_RED_COLOR}${new Date().toISOString()} - ${msg}`);
    console.error(error);
    console.error(RESET_COLOR);
}

module.exports = {
    cmdStart,
    cmdSuccess,
    success,
    info,
    error,
    startChrono,
    stopChrono
}
