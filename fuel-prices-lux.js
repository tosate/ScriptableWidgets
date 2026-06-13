// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: magic;
// Version 2.0.0
// Script by Thomas Salm
// Usage:
// Add credentials and fuelType to your widget parameters: 
// API-Key|Fuel-Type  (diesel, super95, super98)

let apiKey, fuelType
let widgetInput = args.widgetParameter;

if (widgetInput !== null) {
    [apiKey, fuelType] = widgetInput.toString().split("|");

    if (!apiKey || !fuelType) {
        throw new Error("Invalid parameter. Expected format: apiKey|fuelType (diesel, super95, super98)")
    }
} else {
    throw new Error("No Widget paramter set. Expected format: apiKey|fuelType (diesel, super95, super98)")
}

const backColor = Color.dynamic(new Color('FFFFFF'), new Color('111111'))
const backColor2 = Color.dynamic(new Color('EEEEEE'), new Color('222222'))
const textColor = Color.dynamic(new Color('000000'), new Color('EDEDED'))
const greyTextColor = Color.dynamic(new Color('555555'), new Color('BBBBBB'))
const greenTextColor = Color.dynamic(new Color('00cc00'), new Color('00cc00'))
const redTextColor = Color.dynamic(new Color('f92206'), new Color('f92206'))
const trendGoesDown = { sign: "↓", textColor: greenTextColor}
const trendGoesUp = { sign: "↑", textColor: redTextColor}
const noChange = { sign: "→", textColor: textColor }
const mediumFont = Font.mediumSystemFont(14)
const normalFont = Font.mediumSystemFont(10)
const smallFont =  Font.boldSystemFont(11)
const boldFont = Font.boldSystemFont(10)
const super95JsonName = 'Unleaded (Super 95 oct)'
const super95UiLabel = 'Super 95'
const super98JsonName = 'Unleaded (Super 98 oct)'
const super98UiLabel = 'Super 98'

const apiURL = () => `https://fuel.devtom.de?fuelType=${fuelType}`

let fuelData = await loadData(apiKey, fuelType)
let widget = await createWidget(fuelData)

if (!config.runsInWidget) {
    await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

async function loadData(apiKey, fuelType) {
    const req = new Request(apiURL())
    req.headers = { "Authorization": `Bearer ${apiKey}` }
    return await req.loadJSON()
}

function formatValue(value) {
    roundedValue = Math.round((value + Number.EPSILON) * 100) / 100
    price = roundedValue.toFixed(2)
    return price + "€"
}

function moneyTwoDecimalPlaces(value) {
    regex = /^-?\d+(?:\.\d{0,2})?/
    if(value.toString().match(regex) != null) {
        result = value.toString().match(regex)[0]
        result = result.replace(".", ",")
        if(result.length == 4) {
            return result
        } else {
            return result + "0"
        }
    } else {
        return value.toString()
    }
}

function tenthOfCentValue(value) {
    intValue = Math.round((parseFloat(value) + Number.EPSILON) * 1000)
    return (intValue % 10).toString()
}

function formatDelta(olderPrice, newerPrice) {
    const cents = Math.round(Math.abs(newerPrice - olderPrice) * 1000) / 10
    return cents.toFixed(1).replace(".", ",") + "¢"
}

function createList(data) {
    const list = new ListWidget()
    list.setPadding(14, 16, 14, 16)

    const gradient = new LinearGradient()
    gradient.locations = [0, 1]
    gradient.colors = [
        backColor,
        backColor2
    ]
    list.backgroundGradient = gradient

    if (!data.ok) {
        let errorMessage = list.addText(data.status)
        errorMessage.font = Font.boldSystemFont(10)
        errorMessage.textColor = textColor
    }
    return list
}

function addHeaderRow(list, headerText, textColorValue) {
    currentPriceHeader = list.addText(headerText)
    currentPriceHeader.font = boldFont
    currentPriceHeader.textColor = textColorValue
}

function calculateTrend(olderPrice, newerPrice) {
    if(newerPrice < olderPrice) {
        return trendGoesDown
    } else if (newerPrice > olderPrice) {
        return trendGoesUp
    } else {
        return noChange
    }
}

function mapFuelTypeName(fuelType) {
    if(fuelType == super95JsonName) {
        return super95UiLabel
    } else if(fuelType == super98JsonName) {
        return super98UiLabel
    } else {
        return fuelType
    }
}

async function createWidget(data) {
    let list = createList(data)
    list.refreshAfterDate = new Date(Date.now() + 300000)

    let currentPriceData = data.currentPrices[0]
    let previousPriceData = data.previousPrices[0]
    let currentTrend = calculateTrend(previousPriceData.price, currentPriceData.price)

    // Row 1: fuel type (like location in Weather)
    let fuelTypeLabel = list.addText(mapFuelTypeName(currentPriceData.fuelType) + " ⛽")
    fuelTypeLabel.font = Font.mediumSystemFont(16)
    fuelTypeLabel.textColor = textColor

    list.addSpacer(2)

    // Row 2: hero price (like temperature in Weather)
    let priceStack = list.addStack()
    priceStack.bottomAlignContent()

    let mainPrice = priceStack.addText(moneyTwoDecimalPlaces(currentPriceData.price))
    mainPrice.font = Font.boldMonospacedSystemFont(34)
    mainPrice.textColor = textColor
    mainPrice.minimumScaleFactor = 0.8

    let superStack = priceStack.addStack()
    superStack.layoutVertically()
    let superText = superStack.addText(tenthOfCentValue(currentPriceData.price))
    superText.font = Font.boldSystemFont(14)
    superText.textColor = textColor
    superStack.addSpacer(20)

    let euroSign = priceStack.addText("€")
    euroSign.font = Font.boldMonospacedSystemFont(34)
    euroSign.textColor = textColor
    euroSign.minimumScaleFactor = 0.8

    list.addSpacer(4)

    // Row 3: trend arrow + delta (like condition icon in Weather)
    let trendRow = list.addStack()
    trendRow.centerAlignContent()

    let trendArrow = trendRow.addText(currentTrend.sign + " ")
    trendArrow.font = Font.boldSystemFont(22)
    trendArrow.textColor = currentTrend.textColor

    let deltaText = trendRow.addText(formatDelta(previousPriceData.price, currentPriceData.price))
    deltaText.font = Font.mediumSystemFont(17)
    deltaText.textColor = currentTrend.textColor

    list.addSpacer(6)

    // Row 4: date + country context (like H/L in Weather)
    let validFromDate = new Date(currentPriceData.validFrom)
    let dateText = list.addText("seit " + validFromDate.toLocaleDateString("de-DE"))
    dateText.font = Font.systemFont(15)
    dateText.textColor = greyTextColor

    let footer = list.addText("max Preis 🇱🇺")
    footer.font = Font.systemFont(10)
    footer.textColor = greyTextColor

    return list
}