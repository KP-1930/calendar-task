function onHomepage(e) {
  return buildCard();
}

function cardHeaderSection() {
  return CardService.newCardHeader()
    .setTitle(getPropertyData('educastUserName'))
    .setSubtitle(getPropertyData('educastUserEmail'))
    .setImageStyle(CardService.ImageStyle.CIRCLE)
    .setImageUrl(getPropertyData('educastUserImage'));
}

function cardFooterSection() {
  return CardService.newFixedFooter()
    .setPrimaryButton(CardService.newTextButton()
      .setText('Powered by educastic.com')
      .setOpenLink(CardService.newOpenLink()
        .setUrl(BASE_URL)));
}

function buildCard() {
  const apiKey = getPropertyData('API_KEY');
  if (!apiKey) {
    const card = createConfigurationCard();
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  }

  var card = CardService.newCardBuilder()
    .setHeader(cardHeaderSection())
    .setFixedFooter(cardFooterSection())
    .build();

  return card;
}

function buildActionCard() {
  const apiKey = getPropertyData('API_KEY');
  if (!apiKey) {
    const card = createConfigurationCard();
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  }

  var action = CardService.newAction()
    .setFunctionName('onAddEducast');
  var button = CardService.newTextButton()
    .setText('Add Educast')
    .setOnClickAction(action)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  var buttonSet = CardService.newButtonSet()
    .addButton(button);

  var section = CardService.newCardSection()
    .addWidget(buttonSet);

  var card = CardService.newCardBuilder()
    .setHeader(cardHeaderSection())
    .addSection(section)
    .setFixedFooter(cardFooterSection())
    .build();

  return card;
}

function createConfigurationCard(errorMessage) {
  const cardBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Add API Key'));

  const section = CardService.newCardSection();

  // Instructional text
  const instructionText = CardService.newTextParagraph()
    .setText('Please obtain your API key from your profile: **Profile > Integration > JWT Token**');
  section.addWidget(instructionText);

  const apiKeyInput = CardService.newTextInput()
    .setMultiline(true)
    .setFieldName('apiKey')
    .setTitle('API Key');
  section.addWidget(apiKeyInput);

  if (errorMessage) {
    const errorText = CardService.newTextParagraph().setText(errorMessage);
    section.addWidget(errorText);
  }

  const saveButton = CardService.newTextButton()
    .setText('Save')
    .setOnClickAction(CardService.newAction().setFunctionName('handleSaveApiKey'));

  section.addWidget(saveButton);

  cardBuilder.addSection(section);

  return cardBuilder.build();
}

function isValidApiKey(token) {
  const url = `${BASE_URL_API}/user`;

  var options = {
    'muteHttpExceptions': true,
    'method': 'get',
    'headers': {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    console.log('result', result);
    if (result.error) {
      return false;
    }

    storePropertyData('API_KEY', result.api_token);
    storePropertyData('educastUserName', result.name);
    storePropertyData('educastUserEmail', result.email);
    storePropertyData('educastUserImage', `${BASE_IMAGE_PATH}/${result.image}`);
    return true;
  } catch (e) {
    console.log('isValidApiKey Error', e);
    return false;
  }
}

function handleLogout(e) {
  //logout
}

function storePropertyData(key, data) {
  PropertiesService.getUserProperties().setProperty(key, data);
}

function getPropertyData(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}

function removePropertyData(key) {
  return PropertiesService.getUserProperties().deleteProperty(key);
}

function handleSaveApiKey(e) {
 // save api key
}
