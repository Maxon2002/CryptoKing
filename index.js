const request = require('request')

const crypto = require('crypto')
let apiKey = 'mk4G1XNMfVHCqToDmNHkm1Cn9Te3FpedJjwVeW6aBRcCd2KeGSzG3fndNEcRr5Ka'
let secretKey = 'LyTPDTCKNKdrB1FT9Pzg4VMlHtutrRO3PX0LFONQoIp3Tor5OBaiy5edaiTEIR8Z'

let baseApiPoint = 'https://fapi.binance.com'

const fs = require('fs')
const path = require('path')
const klines = require('./klines')

const historical = require('./historyLevels')
const levelsNoInt = require('./levelsAfterNoInternet')

let nAtr = 14


const WebSocket = require('ws')
// let fsStream = 'fstream.binance.com'



function atr(pastRma, n, x) {
    return (pastRma * (n - 1) + x) / n
}



function signature(query) {
    return crypto
        .createHmac('sha256', secretKey)
        .update(query)
        .digest('hex');
}




async function work(howLev, howTou, howStop) {

    let startObj = await historical(Date.now(), 'ETHUSDT', howLev, howTou)

    let objLevels = startObj.objLevels
    let objClearLevels = {}

    let highDate = startObj.highDate
    let lowDate = startObj.lowDate


    let mode = startObj.mode


    console.log('go go go')

    let oldLow = startObj.oldLow
    let oldHigh = startObj.oldHigh

    let high = startObj.high
    let low = startObj.low

    let atrExtr
    let atrExtrFakeUp = startObj.atrExtrFakeUp
    let atrExtrTrueTouch = startObj.atrExtrTrueTouch

    let startD = Math.trunc(Date.now() / 1000 / 60 / 15) * 1000 * 60 * 15


    let atr15Minutes = startObj.atr15Minutes
    // 15 минутный атр
    // let arrAtr15Minutes
    // await klines('ETHUSDT', '15m', nAtr, startD - 1000 * 60 * 15 * nAtr).then(res => arrAtr15Minutes = JSON.parse(res))


    // for (let current of arrAtr15Minutes) {
    //     let proc = (current[2] - current[3]) / current[2]
    //     atr15Minutes += proc
    // }
    // atr15Minutes /= nAtr
    // console.log(atr15Minutes)



    let howMinutes = Math.trunc(Date.now() / 1000 / 60 / 1) * 1000 * 60 * 1

    let iAtr = (howMinutes - startD) / 1000 / 60
    if (iAtr === 0) {
        iAtr = 15
    }
    iAtr--
    startObj.iAtr = iAtr
    let high15Minutes = startObj.high15Minutes
    let low15Minutes = startObj.low15Minutes
    //

    let klinesAtr
    let atr15minutesCurrent = startObj.atr15minutesCurrent

    // if (iAtr > 1) {
    //     await klines('ETHUSDT', '1m', iAtr - 1, startD).then(res => klinesAtr = JSON.parse(res))

    //     for (let cur of klinesAtr) {
    //         if (+cur[2] > high15Minutes) high15Minutes = +cur[2]
    //         if (+cur[3] < low15Minutes) low15Minutes = +cur[3]

    //         let x15minutes = (high15Minutes - low15Minutes) / high15Minutes

    //         atr15minutesCurrent = atr(atr15Minutes, nAtr, x15minutes)
    //     }
    // }

    // let beforeHigh = -1
    // let beforeLow = 100000000


    let pastAtr = startObj.pastAtr

    let fullSum = 0
    let sum = 0
    let bank = 0
    let bnb = 0
    let howNeedBnbInUsdt = 0
    // let bnbInUsdt = 37

    let limitSum = 10000
    let shoulder = 50


    let timeBalance = Date.now()
    let queryBalance = `timestamp=${timeBalance}`

    let hashBalance = signature(queryBalance)

    let internet = true
    let internetNoTime = false

    await new Promise((mainResolve, reject) => {

        (function reRequestBalance() {
            request.get(
                {
                    url: `https://fapi.binance.com/fapi/v2/balance?${queryBalance}&signature=${hashBalance}`,
                    headers: {
                        'X-MBX-APIKEY': apiKey
                    }
                },
                async (err, response, body) => {
                    if (!body) {
                        internet = false
                        if (!internetNoTime) {
                            internetNoTime = true
                        }
                        timeBalance = Date.now()
                        queryBalance = `timestamp=${timeBalance}`
                        hashBalance = signature(queryBalance)
                        setTimeout(reRequestBalance, 1000)
                    } else {
                        body = JSON.parse(body)
                        // console.log(body)
                        for (let b of body) {
                            if (b.asset === 'USDT') {
                                sum = +b.balance
                                fullSum = sum
                                if (sum > limitSum) {
                                    bank = sum - limitSum
                                    sum = limitSum
                                    if (bank / sum < 0.25) {
                                        howNeedBnbInUsdt = fullSum * 0.037
                                        sum = +(fullSum * 0.75).toFixed(8)
                                        bank = +(fullSum * 0.25).toFixed(8)
                                    } else {
                                        howNeedBnbInUsdt = sum * 0.037
                                    }
                                } else {
                                    howNeedBnbInUsdt = sum * 0.037
                                    sum = +(fullSum * 0.75).toFixed(8)
                                    bank = +(fullSum * 0.25).toFixed(8)
                                }
                                // console.log('sum', sum)


                                // console.log('howNeedBnbInUsdt', howNeedBnbInUsdt)
                            }
                            if (b.asset === 'BNB') {
                                bnb = +b.balance
                            }

                        }
                        await new Promise((resol, reject) => {

                            (function reRequestPriceBNB() {
                                request.get(
                                    `https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT`,
                                    async (err, response, body) => {
                                        if (!body) {
                                            internet = false
                                            if (!internetNoTime) {
                                                internetNoTime = true
                                            }
                                            setTimeout(reRequestPriceBNB, 1000)
                                        } else {

                                            body = JSON.parse(body)

                                            let bnbInUsdt = bnb * +body.price

                                            // console.log('bnbInUsdt', bnbInUsdt)

                                            if ((bnbInUsdt - howNeedBnbInUsdt) / bnbInUsdt < 0.03) {
                                                let howNeed = +howNeedBnbInUsdt + howNeedBnbInUsdt * 0.05
                                                let howLacks = howNeed - bnbInUsdt

                                                let tens = Math.trunc((howLacks + 10) / 10) * 10

                                                // console.log('howNeed', howNeed)
                                                // console.log('howLacks', howLacks)
                                                // console.log('tens', tens)


                                                let timeTransferFromFut = Date.now()


                                                let queryTransferFromFut = `asset=USDT&amount=${tens}&type=2&timestamp=${timeTransferFromFut}`;

                                                let hashTransferFromFut = signature(queryTransferFromFut)
                                                let trueTransfer = true

                                                await new Promise((resolve, reject) => {
                                                    (function reRequestTransferFromFut() {
                                                        request.post(
                                                            {
                                                                url: `https://api.binance.com/sapi/v1/futures/transfer?${queryTransferFromFut}&signature=${hashTransferFromFut}`,
                                                                headers: {
                                                                    'X-MBX-APIKEY': apiKey
                                                                }
                                                            },
                                                            (err, response, body) => {
                                                                if (!body) {
                                                                    internet = false
                                                                    if (!internetNoTime) {
                                                                        internetNoTime = true
                                                                    }
                                                                    timeTransferFromFut = Date.now()
                                                                    queryTransferFromFut = `asset=USDT&amount=${tens}&type=2&timestamp=${timeTransferFromFut}`
                                                                    hashTransferFromFut = signature(queryTransferFromFut)
                                                                    setTimeout(reRequestTransferFromFut, 1000)
                                                                } else {
                                                                    body = JSON.parse(body)
                                                                    if (body.code === -5013) {
                                                                        trueTransfer = false
                                                                        console.log('-5013 fromFut')

                                                                    }
                                                                    internet = true
                                                                    resolve()
                                                                }
                                                            }
                                                        )
                                                    })()
                                                })

                                                if (trueTransfer) {
                                                    let timeBuyBNB = Date.now()

                                                    let queryBuyBNB = `symbol=BNBUSDT&side=BUY&type=MARKET&quoteOrderQty=${tens}&timestamp=${timeBuyBNB}`

                                                    let hashBuyBNB = signature(queryBuyBNB)

                                                    let quanBuy

                                                    await new Promise((resolve, reject) => {
                                                        (function reRequestBuyBNB() {
                                                            request.post(
                                                                {
                                                                    url: `https://api.binance.com/api/v3/order?${queryBuyBNB}&signature=${hashBuyBNB}`,
                                                                    headers: {
                                                                        'X-MBX-APIKEY': apiKey
                                                                    }
                                                                },
                                                                (err, response, body) => {
                                                                    if (!body) {
                                                                        internet = false
                                                                        if (!internetNoTime) {
                                                                            internetNoTime = true
                                                                        }
                                                                        timeBuyBNB = Date.now()
                                                                        queryBuyBNB = `symbol=BNBUSDT&side=BUY&type=MARKET&quoteOrderQty=${tens}&timestamp=${timeBuyBNB}`
                                                                        hashBuyBNB = signature(queryBuyBNB)
                                                                        setTimeout(reRequestBuyBNB, 1000)
                                                                    } else {
                                                                        body = JSON.parse(body)
                                                                        quanBuy = +(+body.origQty - body.origQty * 0.00075).toFixed(8)
                                                                        internet = true
                                                                        resolve()
                                                                    }
                                                                }
                                                            )
                                                        })()
                                                    })

                                                    let timeTransferFromSpot = Date.now()

                                                    let queryTransferFromSpot = `asset=BNB&amount=${quanBuy}&type=1&timestamp=${timeTransferFromSpot}`;

                                                    let hashTransferFromSpot = signature(queryTransferFromSpot)
                                                    await new Promise((resolve, reject) => {
                                                        (function reRequestTransferFromSpot() {
                                                            request.post(
                                                                {
                                                                    url: `https://api.binance.com/sapi/v1/futures/transfer?${queryTransferFromSpot}&signature=${hashTransferFromSpot}`,
                                                                    headers: {
                                                                        'X-MBX-APIKEY': apiKey
                                                                    }
                                                                },
                                                                (err, response, body) => {
                                                                    if (!body) {
                                                                        internet = false
                                                                        if (!internetNoTime) {
                                                                            internetNoTime = true
                                                                        }
                                                                        timeTransferFromSpot = Date.now()
                                                                        queryTransferFromSpot = `asset=BNB&amount=${quanBuy}&type=1&timestamp=${timeTransferFromSpot}`
                                                                        hashTransferFromSpot = signature(queryTransferFromSpot)
                                                                        setTimeout(reRequestTransferFromSpot, 1000)
                                                                    } else {
                                                                        if (body.code !== -5013) {
                                                                            bnb += quanBuy
                                                                        } else {
                                                                            console.log('-5013 fromSpot')
                                                                        }

                                                                        fullSum = +(fullSum - tens).toFixed(8)


                                                                        if (bank > tens) {
                                                                            bank = +(bank - tens).toFixed(8)
                                                                            if (bank / sum < 0.25) {
                                                                                sum = +(fullSum * 0.75).toFixed(8)
                                                                                bank = +(fullSum * 0.25).toFixed(8)
                                                                            }
                                                                        } else {

                                                                            sum = +(fullSum * 0.75).toFixed(8)
                                                                            bank = +(fullSum * 0.25).toFixed(8)
                                                                        }

                                                                        internet = true
                                                                        resolve()
                                                                    }
                                                                }
                                                            )
                                                        })()
                                                    })
                                                }
                                            }
                                            internet = true
                                            resol()
                                        }
                                    }
                                )
                            })()
                        })
                        internet = true

                        mainResolve()
                    }


                }
            )
        })()
    })

    console.log('sum start ', sum)
    console.log('bank start ', bank)
    console.log('bnb start ', bnb)


    let lastDateCur = startObj.lastDate
    let indexKlines = 0
    async function sortKline() {
        if (internet) {
            let cur

            await new Promise(resolve => {

                (function reRequestKline() {
                    let t = Date.now() - 120000
                    request(
                        `https://fapi.binance.com/fapi/v1/klines?symbol=ETHUSDT&interval=1m&startTime=${t}&limit=1`,
                        async (err, response, body) => {
                            if (!body) {
                                internet = false
                                if (!internetNoTime) {
                                    internetNoTime = true
                                }
                                setTimeout(reRequestKline, 1000)
                            } else {
                                body = JSON.parse(body).flat()
                                cur = body
                                internet = true


                                if (internetNoTime) {
                                    if (cur[0] - lastDateCur >= 120000) {
                                        let times = Math.trunc((lastDateCur + 60000) / 60000) * 60000
                                        let howMinutesNo = (cur[0] - lastDateCur) / 60000
                                        await levelsNoInt(times, 'ETHUSDT', howLev, howTou, howMinutesNo, startObj)

                                        let how15Minutes = Math.trunc(Date.now() / 1000 / 60 / 15) * 1000 * 60 * 15
                                        let howMinutes = Math.trunc(Date.now() / 1000 / 60 / 1) * 1000 * 60 * 1

                                        startObj.iAtr = (howMinutes - how15Minutes) / 1000 / 60
                                        if (startObj.iAtr === 0) {
                                            startObj.iAtr = 15
                                        }
                                        startObj.iAtr--

                                        lastDateCur = startObj.lastDate
                                        indexKlines = 0
                                    }
                                    internetNoTime = false
                                } else {
                                    internetNoTime = false
                                }


                                resolve()
                            }
                        }
                    )
                })()

            })
            indexKlines++

            if (cur[0] <= lastDateCur) {
                if (indexKlines > 1) {
                    await new Promise(resolve => {

                        (function reRequestKline() {
                            let t = Date.now() - 120000
                            request(
                                `https://fapi.binance.com/fapi/v1/klines?symbol=ETHUSDT&interval=1m&startTime=${t}&limit=1`,
                                async (err, response, body) => {
                                    if (!body) {
                                        internet = false
                                        if (!internetNoTime) {
                                            internetNoTime = true
                                        }
                                        setTimeout(reRequestKline, 1000)
                                    } else {
                                        body = JSON.parse(body).flat()
                                        cur = body
                                        internet = true

                                        if (cur[0] > lastDateCur) {
                                            if (internetNoTime) {
                                                if (cur[0] - lastDateCur >= 120000) {
                                                    let times = Math.trunc((lastDateCur + 60000) / 60000) * 60000
                                                    let howMinutesNo = (cur[0] - lastDateCur) / 60000
                                                    await levelsNoInt(times, 'ETHUSDT', howLev, howTou, howMinutesNo, startObj)

                                                    let how15Minutes = Math.trunc(Date.now() / 1000 / 60 / 15) * 1000 * 60 * 15
                                                    let howMinutes = Math.trunc(Date.now() / 1000 / 60 / 1) * 1000 * 60 * 1

                                                    startObj.iAtr = (howMinutes - how15Minutes) / 1000 / 60
                                                    if (startObj.iAtr === 0) {
                                                        startObj.iAtr = 15
                                                    }
                                                    startObj.iAtr--

                                                    lastDateCur = startObj.lastDate
                                                    indexKlines = 0
                                                } else {
                                                    lastDateCur = cur[0]
                                                }
                                                internetNoTime = false
                                            } else {
                                                lastDateCur = cur[0]
                                                internetNoTime = false
                                            }
                                            resolve()
                                        } else {
                                            setTimeout(reRequestKline, 1000)
                                        }


                                    }
                                }
                            )
                        })()
                    })
                }

            } else {
                lastDateCur = cur[0]
            }

            startObj.iAtr++

            if (cur[0] <= startObj.lastDate) {
                if (startObj.iAtr === 15) {
                    startObj.iAtr = 0
                }
            }

            if (cur[0] > startObj.lastDate) {
                console.log('timeCur ', new Date(cur[0]).toLocaleString())

                let type
                if (+cur[1] > +cur[4]) type = 's'
                else type = 'l'



                console.log('iAtr', startObj.iAtr)
                // 15 минутный атр


                if (+cur[2] > startObj.high15Minutes) startObj.high15Minutes = +cur[2]
                if (+cur[3] < startObj.low15Minutes) startObj.low15Minutes = +cur[3]

                let x15minutes = (startObj.high15Minutes - startObj.low15Minutes) / startObj.high15Minutes

                startObj.atr15minutesCurrent = atr(startObj.atr15Minutes, nAtr, x15minutes)

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
            // console.log(startObj.objLevels)

        }
        let clearTime = Math.trunc((Date.now() + 60000) / 1000 / 60 / 1) * 1000 * 60 * 1
        let difTime = clearTime - Date.now()
        setTimeout(sortKline, difTime + 500)
    }

    sortKline()





    let closesLevel
    let tradingNow = false
    let flipped = false
    let indexOrderFilled = 0

    let lowBnb = false

    let side

    let priceTriger

    async function stopMarket() {

        if (!internet) {
            console.log('noInternet ', new Date().toLocaleString())
        }
        let price
        if (!tradingNow && internet && !lowBnb) {

            await new Promise((resolve, reject) => {
                (function reRequestPrice() {
                    request.get(
                        `https://fapi.binance.com/fapi/v1/ticker/price?symbol=ETHUSDT`,
                        (err, response, body) => {
                            if (!body) {
                                internet = false
                                if (!internetNoTime) {
                                    internetNoTime = true
                                }
                                setTimeout(reRequestPrice, 1000)
                            } else {
                                body = JSON.parse(body)
                                price = +body.price
                                internet = true
                                resolve()
                            }
                        }
                    )
                })()
            })
        }
        if (!tradingNow && internet && !lowBnb) {
            let how = 100000


            for (let levels in startObj.objLevels) {
                let level = startObj.objLevels[levels]

                if (level.clear && !level.used && level.green) {
                    let h
                    if (level.type === 'sell') {
                        h = (level.entryTriger - price) / level.entryTriger
                    } else {
                        h = (price - level.entryTriger) / price
                    }

                    if (h > 0 && h < how) {
                        how = h
                        closesLevel = level
                    }
                    if (h <= 0) {
                        level.used = true
                    }
                }
            }

            // console.log('preCloses ', closesLevel)
            if (!closesLevel.active) {

                side = closesLevel.type === 'sell' ? 'BUY' : 'SELL'

                priceTriger = closesLevel.entryTriger




                let dirtyQuan = sum * shoulder / priceTriger
                let quantity = Math.trunc(dirtyQuan * 1000) / 1000



                // console.log('dirtyQuan ', quantity)

                let timePlace = Date.now()
                let queryPlace = `symbol=ETHUSDT&side=${side}&type=STOP_MARKET&stopPrice=${priceTriger}&quantity=${quantity}&timestamp=${timePlace}`
                let hashPlace = signature(queryPlace)



                let timeCancel = Date.now()
                let queryCancel = `symbol=ETHUSDT&timestamp=${timeCancel}`
                let hashCancel = signature(queryCancel)

                await new Promise((resolve, reject) => {
                    (function reRequestCancel() {
                        request.delete(
                            {
                                url: `https://fapi.binance.com/fapi/v1/allOpenOrders?${queryCancel}&signature=${hashCancel}`,
                                headers: {
                                    'X-MBX-APIKEY': apiKey
                                }
                            },
                            (err, response, body) => {
                                if (!body) {
                                    internet = false
                                    if (!internetNoTime) {
                                        internetNoTime = true
                                    }
                                    timeCancel = Date.now()
                                    queryCancel = `symbol=ETHUSDT&timestamp=${timeCancel}`
                                    hashCancel = signature(queryCancel)
                                    setTimeout(reRequestCancel, 1000)
                                } else {
                                    internet = true
                                    resolve()
                                }
                            }
                        )
                    })()
                })
                await new Promise((resolve, reject) => {
                    (function reRequestPlace() {
                        request.post(
                            {
                                url: `https://fapi.binance.com/fapi/v1/order?${queryPlace}&signature=${hashPlace}`,
                                headers: {
                                    'X-MBX-APIKEY': apiKey
                                }
                            },
                            (err, response, body) => {
                                if (!body) {
                                    internet = false
                                    if (!internetNoTime) {
                                        internetNoTime = true
                                    }
                                    timePlace = Date.now()
                                    queryPlace = `symbol=ETHUSDT&side=${side}&type=STOP_MARKET&stopPrice=${priceTriger}&quantity=${quantity}&timestamp=${timePlace}`
                                    hashPlace = signature(queryPlace)
                                    setTimeout(reRequestPlace, 1000)
                                } else {
                                    body = JSON.parse(body)
                                    internet = true
                                    if (body.code === -2019) {
                                        console.log(body)
                                        quantity = Math.trunc((quantity - quantity * 0.01) * 1000) / 1000
                                        timePlace = Date.now()
                                        queryPlace = `symbol=ETHUSDT&side=${side}&type=STOP_MARKET&stopPrice=${priceTriger}&quantity=${quantity}&timestamp=${timePlace}`
                                        hashPlace = signature(queryPlace)
                                        reRequestPlace()
                                    } else {
                                        for (let levels in startObj.objLevels) {
                                            let level = startObj.objLevels[levels]
                                            if (level.active) {
                                                level.active = false
                                                break
                                            }
                                        }
                                        closesLevel.active = true
                                        if (body.code === -2021) {
                                            console.log('-2021')
                                            closesLevel.active = false
                                            closesLevel.used = true
                                        } else {
                                            console.log(`cloLevOpenTime ${new Date().toLocaleString()}`, closesLevel)
                                        }

                                        resolve()
                                    }

                                }
                            }
                        )
                    })()
                })



            }


        }
        setTimeout(stopMarket, 5000)
    }

    stopMarket()





    let listenKey


    await new Promise((resolve, reject) => {
        request.post(
            {
                url: `https://fapi.binance.com/fapi/v1/listenKey`,
                headers: {
                    'X-MBX-APIKEY': apiKey
                }
            },
            (err, response, body) => {
                body = JSON.parse(body)
                listenKey = body.listenKey
                resolve()
            }
        )

    })


    setInterval(() => {
        (function reRequestListen() {
            request.put(
                {
                    url: `https://fapi.binance.com/fapi/v1/listenKey`,
                    headers: {
                        'X-MBX-APIKEY': apiKey
                    }
                },
                (err, response, body) => {
                    if (!body) {
                        internet = false
                        setTimeout(reRequestListen, 1000)
                    } else {
                        internet = true
                    }
                }
            )
        })()
    }, 3000000)


    let fullStreamUser = `wss://fstream.binance.com/ws/${listenKey}`


    let wsBinUser = new WebSocket(`wss://fstream.binance.com/ws/${listenKey}`)
    wsBinUser.on('open', () => console.log('Соединение Binance userUpdate установлено в ' + new Date().toLocaleTimeString()))
    wsBinUser.on('error', () => console.log('Ошибка! binance userUpdate: ' + new Date().toLocaleString()))
    wsBinUser.on('close', function restart() {
        console.log('Соединение Binance userUpdate закрыто в ' + new Date().toLocaleTimeString())
        setTimeout(() => {
            wsBinUser = new WebSocket(`wss://fstream.binance.com/ws/${listenKey}`)
            wsBinUser.on('error', () => console.log('Ошибка! binance userUpdate: ' + new Date().toLocaleString()))

            wsBinUser.on('open', () => console.log('Соединение Binance userUpdate установлено в ' + new Date().toLocaleTimeString()))
            wsBinUser.on('message', userUpdate)
            wsBinUser.on('ping', data => {
                wsBinUser.pong(data)
            })
            wsBinUser.on('close', restart)
        }, 1000)
    })


    wsBinUser.on('message', userUpdate)
    wsBinUser.on('ping', data => {
        wsBinUser.pong(data)
    })


    async function userUpdate(data) {
        let res = JSON.parse(data.toString())

        if (res.e === 'listenKeyExpired') {
            console.log(`listenKeyExpired ${new Date().toLocaleString()}`)


            await new Promise((resolve, reject) => {
                (function reRequestGetListen() {
                    request.post(
                        {
                            url: `https://fapi.binance.com/fapi/v1/listenKey`,
                            headers: {
                                'X-MBX-APIKEY': apiKey
                            }
                        },
                        (err, response, body) => {
                            if (!body) {
                                internet = false
                                setTimeout(reRequestGetListen, 1000)
                            } else {
                                body = JSON.parse(body)
                                listenKey = body.listenKey
                                internet = true
                                resolve()
                            }
                        }
                    )
                })()
            });

            wsBinUser.close()
        }


        if (res.e === 'ORDER_TRADE_UPDATE') {

            if (res.o.X === 'FILLED') {
                console.log('fill')
            }
            if (res.o.X === 'FILLED' && !tradingNow) {
                tradingNow = true
                closesLevel.used = true

                let stopLoss
                let takeProfit
                let sideProfit
                let quanProfit

                let howProfit = (startObj.pastAtr * 4)
                if (howProfit > 0.01) howProfit = 0.01

                if (res.o.S === 'BUY') {
                    let numLoss = +res.o.ap - res.o.ap * howStop
                    stopLoss = +numLoss.toFixed(2)
                    let numProfit = +res.o.ap + res.o.ap * howProfit
                    takeProfit = +numProfit.toFixed(2)
                    sideProfit = 'SELL'
                    quanProfit = +res.o.q
                }
                if (res.o.S === 'SELL') {
                    let numLoss = +res.o.ap + res.o.ap * howStop
                    stopLoss = +numLoss.toFixed(2)
                    let numProfit = +res.o.ap - res.o.ap * howProfit
                    takeProfit = +numProfit.toFixed(2)
                    sideProfit = 'BUY'
                    quanProfit = +res.o.q
                }



                setTimeout(async () => {

                    let timeLoss = Date.now()

                    let queryLoss = `symbol=ETHUSDT&side=${sideProfit}&type=STOP_MARKET&stopPrice=${stopLoss}&closePosition=true&timestamp=${timeLoss}`

                    let timeProfit = Date.now()
                    // лимит тут
                    let queryProfit = `symbol=ETHUSDT&side=${sideProfit}&type=LIMIT&price=${takeProfit}&quantity=${quanProfit}&timeInForce=GTC&timestamp=${timeProfit}`


                    let hashLoss = signature(queryLoss)

                    let hashProfit = signature(queryProfit);

                    let profitObj = {}
                    let lossObj = {}

                    await new Promise((resolve, reject) => {


                        (function reRequestProfit() {
                            request.post(
                                {
                                    url: `https://fapi.binance.com/fapi/v1/order?${queryProfit}&signature=${hashProfit}`,
                                    headers: {
                                        'X-MBX-APIKEY': apiKey
                                    }
                                },
                                (err, response, body) => {
                                    if (!body) {
                                        internet = false
                                        if (!internetNoTime) {
                                            internetNoTime = true
                                        }
                                        timeProfit = Date.now()
                                        queryProfit = `symbol=ETHUSDT&side=${sideProfit}&type=LIMIT&price=${takeProfit}&quantity=${quanProfit}&timeInForce=GTC&timestamp=${timeProfit}`
                                        hashProfit = signature(queryProfit)
                                        setTimeout(reRequestProfit, 1000)
                                    } else {
                                        body = JSON.parse(body)
                                        if (body.code === -1021) {
                                            console.log('-1021 profit')
                                            timeProfit = Date.now()
                                            queryProfit = `symbol=ETHUSDT&side=${sideProfit}&type=LIMIT&price=${takeProfit}&quantity=${quanProfit}&timeInForce=GTC&timestamp=${timeProfit}`
                                            hashProfit = signature(queryProfit)
                                            setTimeout(reRequestProfit, 1000)
                                        } else {
                                            internet = true
                                            console.log('profit ', body)
                                            profitObj = body
                                            resolve()
                                        }
                                    }
                                }
                            )
                        })();
                    });
                    await new Promise((resolve, reject) => {
                        (function reRequestLoss() {
                            request.post(
                                {
                                    url: `https://fapi.binance.com/fapi/v1/order?${queryLoss}&signature=${hashLoss}`,
                                    headers: {
                                        'X-MBX-APIKEY': apiKey
                                    }
                                },
                                (err, response, body) => {
                                    if (!body) {
                                        internet = false
                                        if (!internetNoTime) {
                                            internetNoTime = true
                                        }
                                        timeLoss = Date.now()
                                        queryLoss = `symbol=ETHUSDT&side=${sideProfit}&type=STOP_MARKET&stopPrice=${stopLoss}&closePosition=true&timestamp=${timeLoss}`
                                        hashLoss = signature(queryLoss)
                                        setTimeout(reRequestLoss, 1000)
                                    } else {
                                        body = JSON.parse(body)
                                        if (body.code === -1021) {
                                            console.log('-1021 loss')

                                            timeProfit = Date.now()
                                            queryProfit = `symbol=ETHUSDT&side=${sideProfit}&type=LIMIT&price=${takeProfit}&quantity=${quanProfit}&timeInForce=GTC&timestamp=${timeProfit}`
                                            hashProfit = signature(queryProfit)
                                            setTimeout(reRequestLoss, 1000)
                                        } else {
                                            internet = true
                                            console.log('loss ', body)
                                            lossObj = body
                                            if (body.code === -2021) {
                                                console.log(`lateLoss ${new Date().toLocaleString()}`)
                                                let timeMarket = Date.now()
                                                let queryMarket = `symbol=ETHUSDT&side=${sideProfit}&type=MARKET&closePosition=true&timestamp=${timeMarket}`
                                                let hashMarket = signature(queryMarket);
                                                (function reRequestMarket() {
                                                    request.post(
                                                        {
                                                            url: `https://fapi.binance.com/fapi/v1/order?${queryMarket}&signature=${hashMarket}`,
                                                            headers: {
                                                                'X-MBX-APIKEY': apiKey
                                                            }
                                                        },
                                                        (err, response, body) => {
                                                            if (!body) {
                                                                internet = false
                                                                if (!internetNoTime) {
                                                                    internetNoTime = true
                                                                }
                                                                timeMarket = Date.now()
                                                                queryMarket = `symbol=ETHUSDT&side=${sideProfit}&type=MARKET&closePosition=true&timestamp=${timeMarket}`
                                                                hashMarket = signature(queryMarket)
                                                                setTimeout(reRequestMarket, 1000)
                                                            } else {
                                                                internet = true
                                                                resolve()
                                                            }
                                                        }
                                                    )
                                                })()
                                            } else {
                                                resolve()
                                            }
                                        }
                                    }
                                }
                            )
                        })()
                    });


                    let timeOpenOrders = Date.now()
                    let queryOpenOrders = `symbol=ETHUSDT&timestamp=${timeOpenOrders}`;


                    let hashOpenOrders = signature(queryOpenOrders);


                    (function reRequestOpenOrders() {
                        request.get(
                            {
                                url: `https://fapi.binance.com/fapi/v1/openOrders?${queryOpenOrders}&signature=${hashOpenOrders}`,
                                headers: {
                                    'X-MBX-APIKEY': apiKey
                                }
                            },
                            (err, response, body) => {
                                if (!body) {
                                    internet = false
                                    if (!internetNoTime) {
                                        internetNoTime = true
                                    }
                                    timeOpenOrders = Date.now()
                                    queryOpenOrders = `symbol=ETHUSDT&timestamp=${timeOpenOrders}`
                                    hashOpenOrders = signature(queryOpenOrders)
                                    setTimeout(reRequestOpenOrders, 1000)
                                } else {
                                    body = JSON.parse(body)
                                    internet = true
                                    if (body.length < 2) {
                                        console.log('profOb ', profitObj)
                                        console.log('lossOb ', lossObj)
                                    }
                                }
                            })
                    })()


                }, 1000)


            } else if (res.o.X === 'FILLED' && tradingNow) {

                indexOrderFilled++

                if (indexOrderFilled === 1) {
                    let timeCancel = Date.now()
                    let queryCancel = `symbol=ETHUSDT&timestamp=${timeCancel}`
                    let hashCancel = signature(queryCancel)

                    await new Promise((resolve, reject) => {
                        (function reRequestCancel() {
                            request.delete(
                                {
                                    url: `https://fapi.binance.com/fapi/v1/allOpenOrders?${queryCancel}&signature=${hashCancel}`,
                                    headers: {
                                        'X-MBX-APIKEY': apiKey
                                    }
                                },
                                (err, response, body) => {
                                    if (!body) {
                                        internet = false
                                        if (!internetNoTime) {
                                            internetNoTime = true
                                        }
                                        timeCancel = Date.now()
                                        queryCancel = `symbol=ETHUSDT&timestamp=${timeCancel}`
                                        hashCancel = signature(queryCancel)
                                        setTimeout(reRequestCancel, 1000)
                                    } else {
                                        internet = true
                                        resolve()
                                    }
                                }
                            )
                        })()
                    })

                    let timePosition = Date.now()

                    let queryPosition = `symbol=ETHUSDT&timestamp=${timePosition}`;

                    let hashPosition = signature(queryPosition)

                    await new Promise((resolve, reject) => {
                        (function reRequestPosition() {
                            request.get(
                                {
                                    url: `https://fapi.binance.com/fapi/v2/positionRisk?${queryPosition}&signature=${hashPosition}`,
                                    headers: {
                                        'X-MBX-APIKEY': apiKey
                                    }
                                },
                                (err, response, body) => {
                                    if (!body) {
                                        internet = false
                                        if (!internetNoTime) {
                                            internetNoTime = true
                                        }
                                        timePosition = Date.now()
                                        queryPosition = `symbol=ETHUSDT&timestamp=${timePosition}`
                                        hashPosition = signature(queryPosition)
                                        setTimeout(reRequestPosition, 1000)
                                    } else {
                                        body = JSON.parse(body)
                                        internet = true
                                        if (body[0] && +body[0].positionAmt > 0) {
                                            console.log(`flipped ${new Date().toLocaleString()}`)
                                            flipped = true
                                            let side = sideProfit === 'SELL' ? 'BUY' : 'SELL'
                                            let timeMarket = Date.now()
                                            let queryMarket = `symbol=ETHUSDT&side=${side}&type=MARKET&closePosition=true&timestamp=${timeMarket}`
                                            let hashMarket = signature(queryMarket);
                                            (function reRequestMarket() {
                                                request.post(
                                                    {
                                                        url: `https://fapi.binance.com/fapi/v1/order?${queryMarket}&signature=${hashMarket}`,
                                                        headers: {
                                                            'X-MBX-APIKEY': apiKey
                                                        }
                                                    },
                                                    (err, response, body) => {
                                                        if (!body) {
                                                            internet = false
                                                            if (!internetNoTime) {
                                                                internetNoTime = true
                                                            }
                                                            timeMarket = Date.now()
                                                            queryMarket = `symbol=ETHUSDT&side=${side}&type=MARKET&closePosition=true&timestamp=${timeMarket}`
                                                            hashMarket = signature(queryMarket)
                                                            setTimeout(reRequestMarket, 1000)
                                                        } else {
                                                            internet = true
                                                            resolve()
                                                        }
                                                    }
                                                )
                                            })()
                                        } else {
                                            resolve()
                                        }

                                    }


                                }
                            )
                        })()
                    })
                }

                if ((indexOrderFilled === 1 && !flipped) || (indexOrderFilled > 1 && flipped)) {
                    let timeBalance = Date.now()
                    let queryBalance = `timestamp=${timeBalance}`

                    let hashBalance = signature(queryBalance);

                    (function reRequestBalance() {
                        request.get(
                            {
                                url: `https://fapi.binance.com/fapi/v2/balance?${queryBalance}&signature=${hashBalance}`,
                                headers: {
                                    'X-MBX-APIKEY': apiKey
                                }
                            },
                            async (err, response, body) => {

                                if (!body) {
                                    internet = false
                                    if (!internetNoTime) {
                                        internetNoTime = true
                                    }
                                    timeBalance = Date.now()
                                    queryBalance = `timestamp=${timeBalance}`
                                    hashBalance = signature(queryBalance)
                                    setTimeout(reRequestBalance, 1000)
                                } else {

                                    body = JSON.parse(body)

                                    for (let b of body) {
                                        if (b.asset === 'USDT') {
                                            sum = +b.balance
                                            fullSum = sum
                                            if (sum > limitSum) {
                                                bank = sum - limitSum
                                                sum = limitSum
                                                if (bank / sum < 0.25) {
                                                    howNeedBnbInUsdt = fullSum * 0.037
                                                    sum = +(fullSum * 0.75).toFixed(8)
                                                    bank = +(fullSum * 0.25).toFixed(8)
                                                } else {
                                                    howNeedBnbInUsdt = sum * 0.037
                                                }

                                            } else {
                                                howNeedBnbInUsdt = sum * 0.037

                                                sum = +(fullSum * 0.75).toFixed(8)
                                                bank = +(fullSum * 0.25).toFixed(8)
                                            }

                                        }
                                        if (b.asset === 'BNB') {
                                            bnb = +b.balance
                                        }
                                    }

                                    await new Promise((resol, reject) => {

                                        (function reRequestPriceBNB() {
                                            request.get(
                                                `https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT`,
                                                async (err, response, body) => {

                                                    if (!body) {
                                                        internet = false
                                                        if (!internetNoTime) {
                                                            internetNoTime = true
                                                        }
                                                        setTimeout(reRequestPriceBNB, 1000)
                                                    } else {

                                                        body = JSON.parse(body)

                                                        let bnbInUsdt = bnb * +body.price

                                                        if ((bnbInUsdt - howNeedBnbInUsdt) / bnbInUsdt < 0.03) {
                                                            let howNeed = +howNeedBnbInUsdt + howNeedBnbInUsdt * 0.05
                                                            let howLacks = howNeed - bnbInUsdt

                                                            let tens = Math.trunc((howLacks + 10) / 10) * 10


                                                            let timeTransferFromFut = Date.now()

                                                            let queryTransferFromFut = `asset=USDT&amount=${tens}&type=2&timestamp=${timeTransferFromFut}`;

                                                            let hashTransferFromFut = signature(queryTransferFromFut)
                                                            let trueTransfer = true
                                                            await new Promise((resolve, reject) => {
                                                                (function reRequestTransferFromFut() {
                                                                    request.post(
                                                                        {
                                                                            url: `https://api.binance.com/sapi/v1/futures/transfer?${queryTransferFromFut}&signature=${hashTransferFromFut}`,
                                                                            headers: {
                                                                                'X-MBX-APIKEY': apiKey
                                                                            }
                                                                        },
                                                                        (err, response, body) => {
                                                                            if (!body) {
                                                                                internet = false
                                                                                if (!internetNoTime) {
                                                                                    internetNoTime = true
                                                                                }
                                                                                timeTransferFromFut = Date.now()
                                                                                queryTransferFromFut = `asset=USDT&amount=${tens}&type=2&timestamp=${timeTransferFromFut}`
                                                                                hashTransferFromFut = signature(queryTransferFromFut)
                                                                                setTimeout(reRequestTransferFromFut, 1000)
                                                                            } else {
                                                                                body = JSON.parse(body)
                                                                                if (body.code === -5013) {
                                                                                    trueTransfer = false
                                                                                    console.log('-5013 fromFut')

                                                                                }
                                                                                internet = true
                                                                                resolve()
                                                                            }
                                                                        }
                                                                    )
                                                                })()
                                                            })

                                                            if (trueTransfer) {
                                                                let timeBuyBNB = Date.now()
                                                                let queryBuyBNB = `symbol=BNBUSDT&side=BUY&type=MARKET&quoteOrderQty=${tens}&timestamp=${timeBuyBNB}`

                                                                let hashBuyBNB = signature(queryBuyBNB)

                                                                let quanBuy

                                                                await new Promise((resolve, reject) => {
                                                                    (function reRequestBuyBNB() {
                                                                        request.post(
                                                                            {
                                                                                url: `https://api.binance.com/api/v3/order?${queryBuyBNB}&signature=${hashBuyBNB}`,
                                                                                headers: {
                                                                                    'X-MBX-APIKEY': apiKey
                                                                                }
                                                                            },
                                                                            (err, response, body) => {
                                                                                if (!body) {
                                                                                    internet = false
                                                                                    if (!internetNoTime) {
                                                                                        internetNoTime = true
                                                                                    }
                                                                                    timeBuyBNB = Date.now()
                                                                                    queryBuyBNB = `symbol=BNBUSDT&side=BUY&type=MARKET&quoteOrderQty=${tens}&timestamp=${timeBuyBNB}`
                                                                                    hashBuyBNB = signature(queryBuyBNB)
                                                                                    setTimeout(reRequestBuyBNB, 1000)
                                                                                } else {
                                                                                    body = JSON.parse(body)
                                                                                    quanBuy = +(+body.origQty - body.origQty * 0.00075).toFixed(8)
                                                                                    internet = true
                                                                                    resolve()
                                                                                }
                                                                            }
                                                                        )
                                                                    })()
                                                                })

                                                                let timeTransferFromSpot = Date.now()
                                                                let queryTransferFromSpot = `asset=BNB&amount=${quanBuy}&type=1&timestamp=${timeTransferFromSpot}`;

                                                                let hashTransferFromSpot = signature(queryTransferFromSpot)
                                                                await new Promise((resolve, reject) => {
                                                                    (function reRequestTransferFromSpot() {
                                                                        request.post(
                                                                            {
                                                                                url: `https://api.binance.com/sapi/v1/futures/transfer?${queryTransferFromSpot}&signature=${hashTransferFromSpot}`,
                                                                                headers: {
                                                                                    'X-MBX-APIKEY': apiKey
                                                                                }
                                                                            },
                                                                            (err, response, body) => {
                                                                                if (!body) {
                                                                                    internet = false
                                                                                    if (!internetNoTime) {
                                                                                        internetNoTime = true
                                                                                    }
                                                                                    timeTransferFromSpot = Date.now()
                                                                                    queryTransferFromSpot = `asset=BNB&amount=${quanBuy}&type=1&timestamp=${timeTransferFromSpot}`
                                                                                    hashTransferFromSpot = signature(queryTransferFromSpot)
                                                                                    setTimeout(reRequestTransferFromSpot, 1000)
                                                                                } else {
                                                                                    if (body.code !== -5013) {
                                                                                        bnb += quanBuy
                                                                                    } else {
                                                                                        console.log('-5013 fromSpot')
                                                                                    }

                                                                                    fullSum = +(fullSum - tens).toFixed(8)

                                                                                    if (bank > tens) {
                                                                                        bank = +(bank - tens).toFixed(8)
                                                                                        if (bank / sum < 0.25) {
                                                                                            sum = +(fullSum * 0.75).toFixed(8)
                                                                                            bank = +(fullSum * 0.25).toFixed(8)
                                                                                        }
                                                                                    } else {

                                                                                        sum = +(fullSum * 0.75).toFixed(8)
                                                                                        bank = +(fullSum * 0.25).toFixed(8)
                                                                                    }

                                                                                    internet = true
                                                                                    resolve()
                                                                                }
                                                                            }
                                                                        )
                                                                    })()
                                                                })
                                                            }
                                                        }
                                                        internet = true
                                                        resol()
                                                    }
                                                }
                                            )
                                        })()
                                    })
                                    internet = true
                                    indexOrderFilled = 0
                                    if (flipped) flipped = false
                                    tradingNow = false


                                    console.log(`sum afterDeal ${new Date().toLocaleString()}`, sum)
                                    console.log(`bank afterDeal ${new Date().toLocaleString()}`, bank)
                                    console.log(`bnb afterDeal ${new Date().toLocaleString()}`, bnb)
                                }
                            }
                        )
                    })()
                }
            }
        }
    }


    setInterval(() => {
        if (!tradingNow) {
            (function reRequestPriceBNB() {
                request.get(
                    `https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT`,
                    async (err, response, body) => {
                        if (!body) {
                            internet = false
                            if (!internetNoTime) {
                                internetNoTime = true
                            }
                            setTimeout(reRequestPriceBNB, 1000)
                        } else {
                            body = JSON.parse(body)

                            let bnbInUsdt = bnb * +body.price

                            if ((bnbInUsdt - howNeedBnbInUsdt) / bnbInUsdt < 0.03) {
                                lowBnb = true
                                console.log('priceBnb low 3 ', new Date().toLocaleString())
                                let howNeed = +howNeedBnbInUsdt + howNeedBnbInUsdt * 0.05
                                let howLacks = howNeed - bnbInUsdt

                                let tens = Math.trunc((howLacks + 10) / 10) * 10


                                let much = true
                                if ((bank - tens) / sum < 0.1) {
                                    much = false
                                }
                                if (!much) {
                                    let timeCancel = Date.now()

                                    let queryCancel = `symbol=ETHUSDT&timestamp=${timeCancel}`

                                    let hashCancel = signature(queryCancel)

                                    await new Promise((resolve, reject) => {
                                        (function reRequestCancel() {
                                            request.delete(
                                                {
                                                    url: `https://fapi.binance.com/fapi/v1/allOpenOrders?${queryCancel}&signature=${hashCancel}`,
                                                    headers: {
                                                        'X-MBX-APIKEY': apiKey
                                                    }
                                                },
                                                (err, response, body) => {
                                                    if (!body) {
                                                        internet = false
                                                        if (!internetNoTime) {
                                                            internetNoTime = true
                                                        }
                                                        timeCancel = Date.now()
                                                        queryCancel = `symbol=ETHUSDT&timestamp=${timeCancel}`
                                                        hashCancel = signature(queryCancel)
                                                        setTimeout(reRequestCancel, 1000)
                                                    } else {
                                                        internet = true
                                                        resolve()
                                                    }
                                                }
                                            )
                                        })()
                                    })

                                    for (let levels in startObj.objLevels) {
                                        let level = startObj.objLevels[levels]
                                        if (level.active) {
                                            level.active = false
                                            break
                                        }
                                    }
                                }




                                let trueTransfer = true

                                let timeTransferFromFut = Date.now()
                                let queryTransferFromFut = `asset=USDT&amount=${tens}&type=2&timestamp=${timeTransferFromFut}`;

                                let hashTransferFromFut = signature(queryTransferFromFut)

                                await new Promise((resolve, reject) => {
                                    (function reRequestTransferFromFut() {
                                        request.post(
                                            {
                                                url: `https://api.binance.com/sapi/v1/futures/transfer?${queryTransferFromFut}&signature=${hashTransferFromFut}`,
                                                headers: {
                                                    'X-MBX-APIKEY': apiKey
                                                }
                                            },
                                            (err, response, body) => {
                                                if (!body) {
                                                    internet = false
                                                    if (!internetNoTime) {
                                                        internetNoTime = true
                                                    }
                                                    timeTransferFromFut = Date.now()
                                                    queryTransferFromFut = `asset=USDT&amount=${tens}&type=2&timestamp=${timeTransferFromFut}`
                                                    hashTransferFromFut = signature(queryTransferFromFut)
                                                    setTimeout(reRequestTransferFromFut, 1000)
                                                } else {
                                                    body = JSON.parse(body)

                                                    if (body.code === -5013) {
                                                        trueTransfer = false
                                                        console.log('-5013 fromFut')

                                                    }
                                                    internet = true
                                                    resolve()
                                                }
                                            }
                                        )
                                    })()
                                })

                                if (trueTransfer) {
                                    let timeBuyBNB = Date.now()
                                    let queryBuyBNB = `symbol=BNBUSDT&side=BUY&type=MARKET&quoteOrderQty=${tens}&timestamp=${timeBuyBNB}`

                                    let hashBuyBNB = signature(queryBuyBNB)

                                    let quanBuy

                                    await new Promise((resolve, reject) => {
                                        (function reRequestBuyBNB() {
                                            request.post(
                                                {
                                                    url: `https://api.binance.com/api/v3/order?${queryBuyBNB}&signature=${hashBuyBNB}`,
                                                    headers: {
                                                        'X-MBX-APIKEY': apiKey
                                                    }
                                                },
                                                (err, response, body) => {
                                                    if (!body) {
                                                        internet = false
                                                        if (!internetNoTime) {
                                                            internetNoTime = true
                                                        }
                                                        timeBuyBNB = Date.now()
                                                        queryBuyBNB = `symbol=BNBUSDT&side=BUY&type=MARKET&quoteOrderQty=${tens}&timestamp=${timeBuyBNB}`
                                                        hashBuyBNB = signature(queryBuyBNB)
                                                        setTimeout(reRequestBuyBNB, 1000)
                                                    } else {
                                                        body = JSON.parse(body)
                                                        quanBuy = +(+body.origQty - body.origQty * 0.00075).toFixed(8)
                                                        internet = true
                                                        resolve()
                                                    }
                                                }
                                            )
                                        })()
                                    })
                                    let timeTransferFromSpot = Date.now()
                                    let queryTransferFromSpot = `asset=BNB&amount=${quanBuy}&type=1&timestamp=${timeTransferFromSpot}`;

                                    let hashTransferFromSpot = signature(queryTransferFromSpot)

                                    await new Promise((resolve, reject) => {
                                        (function reRequestTransferFromSpot() {
                                            request.post(
                                                {
                                                    url: `https://api.binance.com/sapi/v1/futures/transfer?${queryTransferFromSpot}&signature=${hashTransferFromSpot}`,
                                                    headers: {
                                                        'X-MBX-APIKEY': apiKey
                                                    }
                                                },
                                                (err, response, body) => {
                                                    if (!body) {
                                                        internet = false
                                                        if (!internetNoTime) {
                                                            internetNoTime = true
                                                        }
                                                        timeTransferFromSpot = Date.now()
                                                        queryTransferFromSpot = `asset=BNB&amount=${quanBuy}&type=1&timestamp=${timeTransferFromSpot}`
                                                        hashTransferFromSpot = signature(queryTransferFromSpot)
                                                        setTimeout(reRequestTransferFromSpot, 1000)
                                                    } else {
                                                        if (body.code !== -5013) {
                                                            bnb += quanBuy
                                                        } else {
                                                            console.log('-5013 fromSpot')
                                                        }

                                                        fullSum = +(fullSum - tens).toFixed(8)

                                                        if (bank > tens) {
                                                            bank = +(bank - tens).toFixed(8)
                                                            if (bank / sum < 0.25) {
                                                                sum = +(fullSum * 0.75).toFixed(8)
                                                                bank = +(fullSum * 0.25).toFixed(8)
                                                            }
                                                        } else {

                                                            sum = +(fullSum * 0.75).toFixed(8)
                                                            bank = +(fullSum * 0.25).toFixed(8)
                                                        }

                                                        internet = true
                                                        resolve()
                                                    }
                                                }
                                            )
                                        })()
                                    })

                                }
                                console.log(`sum low3 ${new Date().toLocaleString()}`, sum)
                                console.log(`bank low3 ${new Date().toLocaleString()}`, bank)
                                console.log(`bnb low3 ${new Date().toLocaleString()}`, bnb)
                                lowBnb = false

                            }
                            internet = true
                        }
                    }
                )
            })()
        }
    }, 6000)



}

work(3, 2, 0.0045)

