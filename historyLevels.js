const klines = require('./klines')
const getCandles = require('./getCandles')



function atr(pastRma, n, x) {
    return (pastRma * (n - 1) + x) / n
}


let nAtr = 14


async function clear(date, sm, howLev, howTou) {
    let objLevels = {}

    let highDate
    let lowDate

    let mode

    let histDate = date - (1000 * 60 * 60 * 24 * 60)


    let startD = Math.trunc(histDate / 1000 / 60 / 15) * 1000 * 60 * 15

    let oldLow = -1
    let oldHigh = 10000000

    let high = 0
    let low = 0

    let atrExtr
    let atrExtrFakeUp
    let atrExtrTrueTouch


    let atr15Minutes = 0
    // 15 минутный атр
    let arrAtr15Minutes
    await klines(sm, '15m', nAtr, startD - 1000 * 60 * 15 * nAtr).then(res => arrAtr15Minutes = JSON.parse(res))


    for (let current of arrAtr15Minutes) {
        let proc = (current[2] - current[3]) / current[2]
        atr15Minutes += proc
    }
    atr15Minutes /= nAtr


    let high15Minutes = -1
    let low15Minutes = 10000000
    //



    let beforeHigh = -1
    let beforeLow = 100000000

    let arrLevels

    await getCandles(sm, '1m', 87, startD).then(res => arrLevels = res)

    arrLevels.pop()
    
    let atr15minutesCurrent

    let pastAtr = atr15Minutes

    

    for (let i = 0; i < arrLevels.length; i++) {
        let cur = arrLevels[i]



        let type
        if (+cur[1] > +cur[4]) type = 's'
        else type = 'l'



        // 15 минутный атр

        

        if (+cur[2] > high15Minutes) high15Minutes = +cur[2]
        if (+cur[3] < low15Minutes) low15Minutes = +cur[3]

        let x15minutes = (high15Minutes - low15Minutes) / high15Minutes

        atr15minutesCurrent = atr(atr15Minutes, nAtr, x15minutes)

        if ((i + 1) % 15 === 0) {
            atr15Minutes = atr(atr15Minutes, nAtr, x15minutes)
            high15Minutes = -1
            low15Minutes = 1000000
        }
        //


        // основные настройки
        let atrMain = atr15minutesCurrent

        let findLevel = atrMain * howLev
        let trueTouch = atrMain / howTou
        let fakeUp = atrMain / 10
        //


        if (!mode) {
            if (type === 'l') {
                if (+cur[3] < beforeLow) {
                    beforeLow = +cur[3]
                }
                if ((cur[2] - beforeLow) / cur[2] >= findLevel && +cur[2] >= beforeHigh) {
                    mode = 'sell'
                    high = +cur[2]
                    low = +cur[2]
                    // lowLevel = high - high * procLevel
                    highDate = +cur[0] //new Date(cur[0]).toISOString()
                }
                if (+cur[2] > beforeHigh) {
                    beforeHigh = +cur[2]
                }
            }

            if (type === 's') {
                if (+cur[2] > beforeHigh) {
                    beforeHigh = +cur[2]
                }
                if ((beforeHigh - cur[3]) / beforeHigh >= findLevel && +cur[3] <= beforeLow) {
                    mode = 'buy'
                    low = +cur[3]
                    high = +cur[3]
                    // highLevel = +low + low * procLevel
                    lowDate = +cur[0] //new Date(cur[0]).toISOString()
                }
                if (+cur[3] < beforeLow) {
                    beforeLow = +cur[3]
                }

            }
        } else {


            for (let levels in objLevels) {
                let level = objLevels[levels]
                if (level.type === 'sell') {
                    if (!level.green && !level.used) {
                        if (+cur[3] < level.oldLow) {
                            level.green = true
                        }
                    }
                    if (level.clear && +cur[2] >= level.entryTriger && !level.used && level.green) {
                        level.used = true
                    }

                    if (+cur[2] > level.high) {
                        if ((+cur[2] - level.high) / +cur[2] > fakeUp) {
                            delete objLevels[levels]
                        }
                    }

                } else if (level.type === 'buy') {
                    if (!level.green && !level.used) {
                        if (+cur[2] > level.oldHigh) {
                            level.green = true
                        }
                    }
                    if (level.clear && +cur[3] <= level.entryTriger && !level.used && level.green) {
                        level.used = true
                    }

                    if (+cur[3] < level.low) {

                        if ((level.low - +cur[3]) / level.low > fakeUp) {
                            delete objLevels[levels]
                        }
                    }
                }

            }

            // console.log('levels ', Date.now() - startTimeLevel)


            if (mode === 'sell') {
                let goNow = false
                if (type === 's') {
                    if (+cur[2] > high) {
                        high = +cur[2]
                        atrExtrFakeUp = fakeUp
                        atrExtrTrueTouch = trueTouch
                        atrExtr = atrMain
                        low = +cur[3]
                        highDate = +cur[0]

                        goNow = true
                    }
                }
                if (+cur[3] < low || goNow) {
                    low = +cur[3]

                    if ((high - low) / high >= findLevel) {
                        let n = true
                        for (let level in objLevels) {
                            level = objLevels[level]
                            if (level.type === 'sell') {
                                if ((level.high - high) / level.high < atrExtrTrueTouch && (high - level.high) / high < atrExtrFakeUp) {

                                    level.clear = true

                                    let num = high - high * 0.0005
                                    level.entryTriger = +num.toFixed(2)

                                    n = false
                                    break
                                }
                            }
                        }
                        if (n) {
                            oldHigh = high
                            let green = false
                            if (+cur[3] < oldLow) green = true


                            objLevels[new Date(highDate).toLocaleString()] = {
                                date: new Date(highDate).toLocaleString(),
                                type: 'sell',
                                high,
                                green,
                                end: false,
                                clear: false,
                                oldLow,
                                active: false,
                                used: false
                            }
                        }

                        low = +cur[3]
                        high = +cur[3]

                        lowDate = +cur[0]
                        atrExtrFakeUp = fakeUp
                        atrExtrTrueTouch = trueTouch

                        mode = 'buy'
                    }

                }
                if (type === 'l') {
                    if (mode === 'buy') {
                        i--
                    }
                    if (mode === 'sell' && +cur[2] > high) {
                        high = +cur[2]
                        atrExtrFakeUp = fakeUp
                        atrExtrTrueTouch = trueTouch
                        atrExtr = atrMain
                        low = +cur[4]
                        highDate = +cur[0]

                    }
                }
                // console.log('sell ', Date.now() - start)
            } else {
                // console.log(type)
                let goNow = false
                if (type === 'l') {
                    if (+cur[3] < low) {
                        low = +cur[3]
                        atrExtrFakeUp = fakeUp
                        atrExtrTrueTouch = trueTouch
                        atrExtr = atrMain
                        high = +cur[2]
                        lowDate = +cur[0]

                        goNow = true
                    }
                }
                if (+cur[2] > high || goNow) {
                    high = +cur[2]

                    if ((high - low) / high >= findLevel) {
                        let n = true
                        for (let level in objLevels) {
                            level = objLevels[level]
                            if (level.type === 'buy') {
                                if ((low - level.low) / low < atrExtrTrueTouch && (level.low - low) / level.low < atrExtrFakeUp) {

                                    level.clear = true

                                    let num = +low + low * 0.0005
                                    level.entryTriger = +num.toFixed(2)

                                    n = false
                                    break
                                }
                            }
                        }
                        if (n) {
                            oldLow = low

                            let green = false

                            if (+cur[2] > oldHigh) green = true

                            objLevels[new Date(lowDate).toLocaleString()] = {
                                date: new Date(lowDate).toLocaleString(),
                                type: 'buy',
                                low,
                                green,
                                end: false,
                                clear: false,
                                oldHigh,
                                active: false,
                                used: false
                            }
                        }

                        low = +cur[2]
                        high = +cur[2]

                        highDate = +cur[0]
                        atrExtrFakeUp = fakeUp
                        atrExtrTrueTouch = trueTouch

                        mode = 'sell'
                    }

                }
                if (type === 's') {
                    if (mode === 'sell') {
                        i--
                    }
                    if (mode === 'buy' && +cur[3] < low) {
                        low = +cur[3]
                        atrExtrFakeUp = fakeUp
                        atrExtrTrueTouch = trueTouch
                        atrExtr = atrMain
                        high = +cur[4]
                        lowDate = +cur[0]

                    }
                }
            }
        }
        pastAtr = atrMain
    }

    return {
        objLevels,
        atr15Minutes,
        atr15minutesCurrent,
        high15Minutes,
        low15Minutes,
        highDate,
        lowDate,
        mode,
        oldHigh,
        oldLow,
        high,
        low,
        atrExtrFakeUp,
        atrExtrTrueTouch,
        pastAtr,
        lastDate: arrLevels.at(-1)[0]
    }

    // console.log(objLevels)
    // console.log(new Date(arrLevels.at(-1)[0]).toLocaleString())
    // console.log(Date.now() - star)
}

module.exports = clear
// clear(+new Date(2023, 3, 21, 14, 3), 'ETHUSDT', 3, 2)


