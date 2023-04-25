const request = require('request')

module.exports = async function klines(symbol, interval, limit, startTime = null, endTime = null) {
    return await new Promise(res => {
        (function reRequest() {
            request(
                `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=${limit}`,
                (err, response, body) => {
                    if (!body) {
                        setTimeout(reRequest, 1000)
                    } else {
                        res(body)
                    }
                }
            )
        })()
    })

}
