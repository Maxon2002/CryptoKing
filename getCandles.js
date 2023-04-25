const klines = require('./klines')

async function getCandles(sm, int, count, start, end) {
    // console.log(sm, int, count, start, end)
    let n = false
    let index = 1
    if(count >= 100) {
        n = true
    }
    let plus
    let arr = []
    let curEnd
    // console.log(start)
    let limitDate = +new Date(2022, 11, 6, 22)
    if (int === '1m') {
        plus = 1000 * 60000
    }
    if (int === '3m') {
        plus = 1000 * 180000
    }
    if (int === '5m') {
        plus = 1000 * 300000
    }
    if (int === '15m') {
        plus = 1000 * 900000
    }
    if (int === '30m') {
        plus = 1000 * 1800000
    }
    if (int === '1h') {
        plus = 1000 * 3600000
    }

    // if (start + plus * count > limitDate) {
    //     count = Math.floor((limitDate - start) / plus)
    // }
    async function cir() {
        if(n) console.log(index++)
        count--
        await klines(sm, int, 1000, start, end).then(res => arr.push(JSON.parse(res)))
        // console.log(arr)
        start += plus
        if (count > 0) await cir()
    }
   

    await cir()
    // console.log(arr)
    return arr.flat()
}

module.exports = getCandles
