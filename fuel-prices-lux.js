// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: magic;
// Version 1.0.0
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
const mediumFont = Font.mediumSystemFont(14)
const normalFont = Font.mediumSystemFont(10)
const smallFont =  Font.boldSystemFont(11)
const boldFont = Font.boldSystemFont(10)
const super95JsonName = 'Unleaded (Super 95 oct)'
const super95UiLabel = 'Super 95'
const super98JsonName = 'Unleaded (Super 98 oct)'
const super98UiLabel = 'Super 98'

const apiURL = (apiKey) => `https://fuel.devtom.de?apikey=${apiKey}&fuelType=${fuelType}`

let fuelData = await loadData(apiKey, fuelType)
let widget = await createWidget(fuelData)

if (!config.runsInWidget) {
    await widget.presentSmall()
}

Script.setWidget(widget)
Script.complete()

async function loadData(apiKey, fuelType) {
    
    const data = await new Request(apiURL(apiKey, fuelType)).loadJSON()

    return data
}

function formatValue(value) {
    roundedValue = Math.round((value + Number.EPSILON) * 100) / 100
    price = roundedValue.toFixed(2)
    return price + "€"
}

function moneyTwoDecimalPlaces(value) {
    return value.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]
}

function tenthOfCentValue(value) {
    intValue = value * 1000
    return (intValue % 10).toString()
}

function createList(data) {
    const list = new ListWidget()
    list.setPadding(10, 10, 10, 10)

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
    } else {
        return trendGoesUp
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
    let list = createList(data);
    list.refreshAfterDate = new Date(Date.now() + 300000);

    let currentPriceData = data.currentPrices[0]
    let previousPriceData = data.previousPrices[0]
    let currentTrend = calculateTrend(previousPriceData.price, currentPriceData.price)

    let topBar = list.addStack()
    let topBarIcons = topBar.addText("⛽️ max Preis in 🇱🇺")
    topBarIcons.font = mediumFont
    list.addSpacer(6)

    currentPriceArea = list.addStack()
    // current price
    currentPrice = currentPriceArea.addText(moneyTwoDecimalPlaces(currentPriceData.price))
    currentPrice.font = Font.boldMonospacedSystemFont(26)
    currentPrice.textColor = textColor
    // tenth of a cent
    tenthOfCent = currentPriceArea.addText(tenthOfCentValue(currentPriceData.price))
    tenthOfCent.font = smallFont
    tenthOfCent.textColor = textColor
    // currency symbol
    currencySymbol = currentPriceArea.addText("€")
    currencySymbol.font = Font.boldMonospacedSystemFont(26)
    currencySymbol.textColor = textColor
    // trend arrow
    trendArrow = currentPriceArea.addText(currentTrend.sign)
    trendArrow.font = Font.boldMonospacedSystemFont(19)
    trendArrow.textColor = currentTrend.textColor
    // fuel type label
    fuelTypeLabel = currentPriceArea.addText(mapFuelTypeName(currentPriceData.fuelType))
    fuelTypeLabel.font = smallFont
    fuelTypeLabel.textColor = textColor

    currentPriceDate = new Date(currentPriceData.validFrom)
    currentPriceValidSince = "seit " + currentPriceDate.toLocaleDateString("de-DE")
    currentPriceInfo = list.addText(currentPriceValidSince)
    currentPriceInfo.font = normalFont
    currentPriceInfo.textColor = textColor

    list.addSpacer(6)
    previousPrice = "vorher " + previousPriceData.price
    previousPriceInfo = list.addText(previousPrice)
    previousPriceInfo.font = mediumFont
    previousPriceInfo.textColor = greyTextColor

    list.addSpacer(2)
    futurePriceDataArray = data.futurePrices
    if(futurePriceDataArray.length > 0) {
        futurePriceData = futurePriceDataArray[0]
        futureTrend = calculateTrend(currentPriceData.price, futurePriceData.price)
        futurePriceDate = new Date(futurePriceData.validFrom)
        futurePriceMessage = "ab " + futurePriceDate.toLocaleDateString("de-DE") + " " + futurePriceData.price
        futurePriceInfo = list.addText(futurePriceMessage)
        futurePriceInfo.font = mediumFont
        futurePriceInfo.textColor = futureTrend.sign
    }
    list.addSpacer()

    return list
}