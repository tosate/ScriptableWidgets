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

function addPriceRow(list, fuelType, priceValue, trendValue) {
    fontSize = 10
    priceStack = list.addStack()
    fuelTypeLabel = priceStack.addText(fuelType + ": ")
    fuelTypeLabel.font = normalFont

    priceStack.addSpacer()
    if(trendValue == null) {
        fuelTypeLabel.textColor = greyTextColor
        priceTextColor = greyTextColor
    } else {
        fuelTypeLabel.textColor = textColor
        trendArrow = priceStack.addText(trendValue.sign)
        trendArrow.Font = normalFont
        trendArrow.textColor = trendValue.textColor
        priceTextColor = trendValue.textColor
    }
    price = priceStack.addText(formatValue(priceValue))
    price.font = normalFont
    price.textColor = priceTextColor
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
    currentPrice = currentPriceArea.addText(formatValue(currentPriceData.price))
    currentPrice.font = Font.boldMonospacedSystemFont(26)
    currentPrice.textColor = textColor
    trendArrow = currentPriceArea.addText(currentTrend.sign)
    trendArrow.font = Font.boldMonospacedSystemFont(19)
    trendArrow.textColor = currentTrend.textColor
    fuelTypeLabel = currentPriceArea.addText(mapFuelTypeName(currentPriceData.fuelType))
    fuelTypeLabel.font = smallFont
    fuelTypeLabel.textColor = textColor

    currentPriceDate = new Date(currentPriceData.validFrom)
    currentPriceValidSince = "seit " + currentPriceDate.toLocaleDateString("de-DE")
    currentPriceInfo = list.addText(currentPriceValidSince)
    currentPriceInfo.font = normalFont
    currentPriceInfo.textColor = textColor

    list.addSpacer(6)
    previousPrice = "vorher " + formatValue(previousPriceData.price)
    previousPriceInfo = list.addText(previousPrice)
    previousPriceInfo.font = mediumFont
    previousPriceInfo.textColor = greyTextColor

    list.addSpacer(2)
    futurePriceDataArray = data.futurePrices
    if(futurePriceDataArray.length > 0) {
        futurePriceData = futurePriceDataArray[0]
        futureTrend = calculateTrend(currentPriceData.price, futurePriceData.price)
        futurePriceDate = new Date(futurePriceData.validFrom)
        futurePriceMessage = "ab " + futurePriceDate.toLocaleDateString("de-DE") + " " + formatValue(futurePriceData.price)
        futurePriceInfo = list.addText(futurePriceMessage)
        futurePriceInfo.font = mediumFont
        futurePriceInfo.textColor = futureTrend.sign
    }
    list.addSpacer()

    return list
}