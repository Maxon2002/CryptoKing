const klines = require('./klines')
const getCandles = require('./getCandles')



function atr(pastRma, n, x) {
    return (pastRma * (n - 1) + x) / n
}


let nAtr = 14


async function levelsNoInt(date, sm, howLev, howTou, howMinutesNo, startObj) {

    // let histDate = date - (1000 * 60 * 60 * 24 * 90)

    // let startD = Math.trunc(histDate / 1000 / 60 / 15) * 1000 * 60 * 15

    let arrLevels

    let thousands = (Math.trunc((howMinutesNo + 1000) / 1000) * 1000) / 1000
    if(thousands * 1000 - howMinutesNo < 5) thousands++
    
    await getCandles(sm, '1m', thousands, date).then(res => arrLevels = res)

    arrLevels.pop()

    startObj.lastDate = arrLevels.at(-1)[0]

    for (let i = 0; i < arrLevels.length; i++) {
        let cur = arrLevels[i]



        let type
        if (+cur[1] > +cur[4]) type = 's'
        else type = 'l'



        // 15 минутный атр


        if (+cur[2] > startObj.high15Minutes) startObj.high15Minutes = +cur[2]
        if (+cur[3] < startObj.low15Minutes) startObj.low15Minutes = +cur[3]

        let x15minutes = (startObj.high15Minutes - startObj.low15Minutes) / startObj.high15Minutes

        startObj.atr15minutesCurrent = atr(startObj.atr15Minutes, nAtr, x15minutes)
        startObj.iAtr++
        if (startObj.iAtr % 15 === 0) {
            startObj.atr15Minutes = atr(startObj.atr15Minutes, nAtr, x15minutes)
            startObj.high15Minutes = -1
            startObj.low15Minutes = 1000000
            startObj.iAtr = 0
        }

        //


        // основные настройки
        let atrMain = startObj.atr15minutesCurrent

        let findLevel = atrMain * howLev
        let trueTouch = atrMain / howTou
        let fakeUp = atrMain / 10
        //


        startObj.pastAtr = atrMain




        for (let levels in startObj.objLevels) {
            let level = startObj.objLevels[levels]
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
                        delete startObj.objLevels[levels]
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
                        delete startObj.objLevels[levels]
                    }
                }
            }

        }

        // console.log('levels ', Date.now() - startTimeLevel)


        if (startObj.mode === 'sell') {
            let goNow = false
            if (type === 's') {
                if (+cur[2] > startObj.high) {
                    startObj.high = +cur[2]
                    startObj.atrExtrFakeUp = fakeUp
                    startObj.atrExtrTrueTouch = trueTouch
                    atrExtr = atrMain
                    startObj.low = +cur[3]
                    startObj.highDate = +cur[0]

                    goNow = true
                }
            }
            if (+cur[3] < startObj.low || goNow) {
                startObj.low = +cur[3]

                if ((startObj.high - startObj.low) / startObj.high >= findLevel) {
                    let n = true
                    for (let level in startObj.objLevels) {
                        level = startObj.objLevels[level]
                        if (level.type === 'sell') {
                            if ((level.high - startObj.high) / level.high < startObj.atrExtrTrueTouch && (startObj.high - level.high) / startObj.high < startObj.atrExtrFakeUp) {

                                level.clear = true

                                let num = startObj.high - startObj.high * 0.0005
                                level.entryTriger = +num.toFixed(2)

                                n = false
                                break
                            }
                        }
                    }
                    if (n) {
                        startObj.oldHigh = startObj.high
                        let green = false
                        if (+cur[3] < startObj.oldLow) green = true


                        startObj.objLevels[new Date(startObj.highDate).toLocaleString()] = {
                            date: new Date(startObj.highDate).toLocaleString(),
                            type: 'sell',
                            high: startObj.high,
                            green,
                            end: false,
                            clear: false,
                            oldLow: startObj.oldLow,
                            active: false,
                            used: false
                        }
                    }

                    startObj.low = +cur[3]
                    startObj.high = +cur[3]

                    startObj.lowDate = +cur[0]
                    startObj.atrExtrFakeUp = fakeUp
                    startObj.atrExtrTrueTouch = trueTouch

                    startObj.mode = 'buy'
                }

            }
            if (type === 'l') {
                if (startObj.mode === 'buy') {
                    i--
                }
                if (startObj.mode === 'sell' && +cur[2] > startObj.high) {
                    startObj.high = +cur[2]
                    startObj.atrExtrFakeUp = fakeUp
                    startObj.atrExtrTrueTouch = trueTouch
                    atrExtr = atrMain
                    startObj.low = +cur[4]
                    startObj.highDate = +cur[0]

                }
            }
            // console.log('sell ', Date.now() - start)
        } else {
            // console.log(type)
            let goNow = false
            if (type === 'l') {
                if (+cur[3] < startObj.low) {
                    startObj.low = +cur[3]
                    startObj.atrExtrFakeUp = fakeUp
                    startObj.atrExtrTrueTouch = trueTouch
                    atrExtr = atrMain
                    startObj.high = +cur[2]
                    startObj.lowDate = +cur[0]

                    goNow = true
                }
            }
            if (+cur[2] > startObj.high || goNow) {
                startObj.high = +cur[2]

                if ((startObj.high - startObj.low) / startObj.high >= findLevel) {
                    let n = true
                    for (let level in startObj.objLevels) {
                        level = startObj.objLevels[level]
                        if (level.type === 'buy') {
                            if ((startObj.low - level.low) / startObj.low < startObj.atrExtrTrueTouch && (level.low - startObj.low) / level.low < startObj.atrExtrFakeUp) {

                                level.clear = true

                                let num = +startObj.low + startObj.low * 0.0005
                                level.entryTriger = +num.toFixed(2)

                                n = false
                                break
                            }
                        }
                    }
                    if (n) {
                        startObj.oldLow = startObj.low

                        let green = false

                        if (+cur[2] > startObj.oldHigh) green = true

                        startObj.objLevels[new Date(startObj.lowDate).toLocaleString()] = {
                            date: new Date(startObj.lowDate).toLocaleString(),
                            type: 'buy',
                            low: startObj.low,
                            green,
                            end: false,
                            clear: false,
                            oldHigh: startObj.oldHigh,
                            active: false,
                            used: false
                        }
                    }

                    startObj.low = +cur[2]
                    startObj.high = +cur[2]

                    startObj.highDate = +cur[0]
                    startObj.atrExtrFakeUp = fakeUp
                    startObj.atrExtrTrueTouch = trueTouch

                    startObj.mode = 'sell'
                }

            }
            if (type === 's') {
                if (startObj.mode === 'sell') {
                    i--
                }
                if (startObj.mode === 'buy' && +cur[3] < startObj.low) {
                    startObj.low = +cur[3]
                    startObj.atrExtrFakeUp = fakeUp
                    startObj.atrExtrTrueTouch = trueTouch
                    atrExtr = atrMain
                    startObj.high = +cur[4]
                    startObj.lowDate = +cur[0]

                }
            }
        }
    }


    // console.log(objLevels)
    // console.log(new Date(arrLevels.at(-1)[0]).toLocaleString())
    // console.log(Date.now() - star)
}

module.exports = levelsNoInt
// clear(+new Date(2023, 3, 21, 14, 3), 'ETHUSDT', 3, 2)


