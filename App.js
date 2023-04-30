import { StatusBar } from 'expo-status-bar';
import React, {useState, useEffect} from 'react';
import { StyleSheet, Text, View, Button, SafeAreaView, ScrollView, ImageBackground, Image, 
        TouchableOpacity, Alert, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Cell, Section, TableView } from 'react-native-tableview-simple';
import NetInfo from '@react-native-community/netinfo';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Storage } from 'expo-storage';
import { RadioButton } from 'react-native-paper';
import { Col, Row, Grid } from "react-native-easy-grid";
import { CardField, useConfirmPayment, StripeProvider } from '@stripe/stripe-react-native';
import { Divider } from 'react-native-elements';

// import the environment variables
import { QRCODE_SERVER } from '@env';

// this is the shop like background to pages
const image = require('./assets/images/shop.jpg');

function HomeScreen({route, navigation}) {

  const [internetConnected, setInternetConnected] = useState(true);
  const [offlineFlag, setOfflineFlag] = useState(false);

  const unsubscribe = NetInfo.addEventListener(state => {
    //console.log('Is connected?', state.isConnected);
    //Alert.alert('Is connected?', `${state.isConnected}`);
    if (internetConnected != state.isConnected) {
      setInternetConnected(state.isConnected);
    }
  });

  //get the offline flag from storage and set the state variable
  const setOfflineFlagStore = async () => {
    const item = JSON.parse(
    await Storage.getItem({ key: `$offlineFlag` })
    );
    setOfflineFlag(item);
    console.log({item});
  }

  useEffect(() => {
    // Update all state variable from the store once home page called
    setOfflineFlagStore();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={{height:"100%"}}>
        <ImageBackground source={image} style={styles.image}>
        <TableView>
          <Section>
            <Text style={styles.headertext}>Home Screen QRcodeShopper</Text>
            <Text style={styles.connected}>{internetConnected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
            </Text>
            <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <View>
              <Text style={styles.helptext}>Scan The QRCode Of The Item To Be Purchased</Text>
              <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => navigation.navigate("Scan", 
                  {connected: internetConnected})}
                >
                  <Text style={styles.infotext}>GO TO SCAN ITEM QR CODE</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <View>
            <Text style={styles.helptext}>Inspect The QR Codes Scanned, Get Product Details and Adjust Shopping List If Necessary</Text>
              <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => navigation.navigate("List",  
                  {connected: internetConnected})}
              >
                <Text style={styles.infotext}>GO TO INSPECT SHOPPING LIST</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <View>
            <Text style={styles.helptext}>Select The Payment Method and Proceed To Pay</Text>
              <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => navigation.navigate("Pay",  
                  {connected: internetConnected})}
                >
                <Text style={styles.infotext}>GO TO SELECT PAYMENT OPTION</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <View>
            <Text style={styles.helptext}>Select The Delivery Option and Confirm Delivery</Text>
              <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => navigation.navigate("Deliver", 
                  {connected: internetConnected})}
                >
                <Text style={styles.infotext}>GO TO SELECT DELIVERY METHOD</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <View>
            <Text style={styles.helptext}>Set Some App Options, Offline Mode For Example</Text>
              <TouchableOpacity 
                style={styles.touchlink}
                onPress={() => navigation.navigate("Settings", 
                  {connected: internetConnected})}
              >
                <Text style={styles.infotext}>GO ADJUST APP SETTINGS</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" />           
        </TableView>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScanScreen({route, navigation}) {

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [code, setCode] = useState([]);

  // this will append code to stored codes
  const putCodeInStore = async (code) => {
    // THIS NEEDS WORK TO APPEND VALUE
    console.log("Write Code To Store");
    // write out whats already there
    var codes = JSON.parse(
      await Storage.getItem({ key: `$codes` })
    );
    // add the new scanned code to the array
    codes.push(code);
    // use this to store in key $sinfo
    await Storage.setItem({
      key: `$codes`,
      value: JSON.stringify(codes)
    });
  }

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    console.log(`Code Scanned = ${data}`);
    // put the code in temp storage
    putCodeInStore({code:data});
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />}
    </View>
  );
}

function ListScreen({route, navigation}) {

  const [offlineFlag, setOfflineFlag] = useState(false);
  const [codes, setCodes] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [totalCost, setTotalCost] = useState(0.00);

  // set the codes state variable from the local storage codes
  const setCodesStore = async () => {
    const items = JSON.parse(
    await Storage.getItem({ key: `$codes` })
    );
    setCodes(items);
  }

  // store the calculated total cost in local storage
  const storeTotalCost = async () => {
    // use this to store in key $sinfo
    await Storage.setItem({
      key: `$totalCost`,
      value: JSON.stringify(totalCost)
    });
  }

  // store the shopping list in local storage
  const storeShoppingList = async () => {
    // use this to store in key $sinfo
    await Storage.setItem({
      key: `$shoppingList`,
      value: JSON.stringify([
        {"shoppingList":shoppingList}
      ])
    });
  }

  const reqItemsServer = async () => {
    // use list of codes scanned to query server for item details 
    let reqCodes =[];
    codes.forEach(code => {
      reqCodes.push(code.code);
    });
    // use set to remove duplicates
    reqCodes = [...new Set(reqCodes)];

    // set the fetch options
    const options = {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqCodes),
    };
    // attempt to get data from server
    try {
      const response = await fetch(`${QRCODE_SERVER}/api/items`, options);
      const json = await response.json();

      // loop through json adding qty, total and total cost fields
      let runningTotal = 0;
      json.forEach(item => {
        // create an array of matches in codes array
        let matchcodes = codes.filter((code) => {
          return code.code == item.code; 
        });
        item.qty = matchcodes.length;
        item.total = item.qty * item.price;
        // add to running total
        runningTotal += item.total;
      });

      // set the shopping list and totals and store shopping list
      setShoppingList(json);
      storeShoppingList();
      setTotalCost(runningTotal);
    }
    catch(err) {
      console.log("SERVER ERROR! " + err);
    }
  }

  const calcTotal = () => {
    let runningTotal = 0.0;
    shoppingList.forEach(item => {
      // add to running total
      runningTotal += item.total;
    });
    // set the totals
    setTotalCost(runningTotal);
    storeTotalCost();
  }

  const incQty = (key) => {
    let tempList = shoppingList;
    tempList[key].qty += 1;
    tempList[key].total = tempList[key].qty * tempList[key].price;
    setShoppingList(tempList);
    storeShoppingList();
    calcTotal();
  }

  const decQty = (key) => {
    let tempList = shoppingList;
    if (tempList[key].qty >= 1) {
      tempList[key].qty -= 1;
    tempList[key].total = tempList[key].qty * tempList[key].price;
    setShoppingList(tempList);
    storeShoppingList();
    calcTotal();
    }
  }

  useEffect(() => {
    // get codes from temp storage
    setCodesStore();

    // check if network OK before automatically performing query
    //if (route.params.connected = "CONNECTED") {
    //  console.log("Network OK, Making API Query");
    //  reqItemsServer();
    //} else {
    //  console.log("Problems With Network, Limited Functionality !!!")
    //}
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={{height:"100%"}}>
        <ImageBackground source={image} style={styles.image}>
        <TableView>
          <Section>
            <Text style={styles.headertext}>List Screen QRcodeShopper</Text>
            <Text style={styles.connected}>{route.params.connected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
            </Text>
            <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
          </Section>
          <Divider width={5} color="darkgray" /> 
          <Section>
            <Cell>
              <Text style={styles.helptext}>The List Of Codes Scanned : </Text>
            </Cell>
            <Grid>
              <Row >
                <Col size={1}>
                  <Text style={styles.boldtext}>Index</Text>
                </Col>
                <Col size={4}>
                  <Text style={styles.boldtext}>Code Scanned</Text>
                </Col>
              </Row>
              {codes.map((item, key) => (
                <Row key={key}>
                    <Col size={1}>
                      <Text style={styles.boldtext}> {key}</Text>
                    </Col>
                    <Col size={4}>
                      <Text style={styles.boldtext}>{item.code}</Text>
                    </Col>
                </Row>
              ))}
            </Grid>            
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <View>
              <Text style={styles.helptext}>Request Item Data From Server</Text>
              <TouchableOpacity 
                style={styles.touchlink}
                onPress={reqItemsServer}
              >
                <Text style={styles.infotext}>GET SHOPPING LIST FROM CODES</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" />
          <Section>
            <Cell>
              <Text style={styles.helptext}>The Shopping List Items :</Text>
            </Cell>
            <Grid>
              <Row>
                <Col size={6}>
                  <Text style={styles.boldtext}>Description</Text>
                </Col>
                <Col size={2}>
                  <Text style={styles.boldtext}>Price</Text>
                </Col>
                <Col size={1}>
                  <Text style={styles.boldtext}>+1</Text>
                </Col>
                <Col size={2}>
                  <Text style={styles.boldtext}>Qty</Text>
                </Col>
                <Col size={1}>
                  <Text style={styles.boldtext}>-1</Text>
                </Col>
                <Col size={2}>
                  <Text style={styles.boldtext}>Total</Text>
                </Col>
              </Row>
            {shoppingList.map((item, key) => (
            <Row  key={key}>
              <Col size={6}>
                <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => navigation.navigate("Detail", 
                    {item: item, 
                    connected: route.params.connected})}
                >
                  <Text style={styles.infotext}>{item.description}</Text>
                </TouchableOpacity>              
              </Col>
              <Col size={2}>
              <Text style={styles.boldtext}>{item.price}</Text>
              </Col>
              <Col size={1}>
                <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => incQty(key)}
                >
                  <Text style={styles.infotext}>+</Text>
                </TouchableOpacity>                         
              </Col>
              <Col size={2}>
                <Text style={styles.boldtext}> {item.qty}</Text>
              </Col>              
              <Col size={1}>
                <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => decQty(key)}
                >
                  <Text style={styles.infotext}>-</Text>
                </TouchableOpacity>             
              </Col>
              <Col size={2}>
                <Text style={styles.boldtext}> {item.total}</Text>
              </Col>            
            </Row>
            ))}
              <Row style={styles.infotext}>
                <Col size={12}>
                  <Text style={styles.boldtext}>The Shopping List Total Is :</Text>
                </Col>
                <Col size={2}>
                  <Text style={styles.boldtext}>{totalCost}</Text>
                </Col>
              </Row>
            </Grid>          
          </Section>
          <Divider width={5} color="darkgray" /> 
        </TableView>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

function PayScreen({route, navigation}) {

  const [offlineFlag, setOfflineFlag] = useState(false);
  const [cardList, setCardList] = useState([]);
  const [card, setCard] = useState(null); 
  const [payment, setPayment] = useState('Cash');
  const [totalCost, setTotalCost] = useState(0.0);

  // set totalCost from storage
  const setTotalCostStore = async () => {
    try {
      const item = JSON.parse(
      await Storage.getItem({ key: `$totalCost` })
      );
      setTotalCost(item);
    }
    catch(err) {
      console.log("RETRIEVE ERROR! " + err);
    }
  }

  const reqCards = async () => {
    // attempt to contact server 
    try {
      const response = await fetch(`${QRCODE_SERVER}/api/cards`);
      const json = await response.json();
      setCardList(json);
      //console.log(json);
    }
    catch(err) {
      console.log("SERVER ERROR! " + err);
    }
  }

  // store the card state variable in local storage
  const storeCard = async () => {
    try {
    // use this to store in key $card
      await Storage.setItem({
      key: `$card`,
      value: JSON.stringify(card)
      });
    } catch(err) {
      console.log("STORE ERROR! " + err)
    }
  }

  useEffect(() => {
    // check if network OK before automatically performing query
    if (route.params.connected = "CONNECTED") {
      console.log("Network OK, Making API Query");
      reqCards();
    } else {
      console.log("Problems With Network, Limited Functionality !!!")
    }
    // set totalCost from storage
    setTotalCostStore();
  }, []);

// details of card data are :
// {item.id} {item.cardnum} {item.expiry} {item.signature}
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
      <ImageBackground source={image} style={styles.image}>
        <TableView>
          <Section>
            <Text style={styles.headertext}>Pay Screen QRcodeShopper</Text>
            <Text style={styles.connected}>{route.params.connected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
            </Text>
            <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
          </Section>
          <Divider width={5} color="darkgray" /> 
          <Section>
            <View>
              <Text style={styles.helptext}>The Total Amount To Pay Is : {totalCost}</Text>
            </View>
          </Section>
          <Divider width={5} color="darkgray" /> 
          <Section>
            <View>
              <Text style={styles.label}>SELECT PAYMENT METHODS FROM OPTIONS :</Text>
            </View>
            <View>
              <RadioButton.Group 
                onValueChange={value => {
                  if (value != 'Cash') {
                    let selectedCard = cardList.filter(card => card.cardnum == value);
                    setCard(selectedCard[0]);
                    storeCard();
                  };
                  setPayment(value);
                }} 
                value={payment}
              >
                <RadioButton.Item label="Cash" value="Cash" labelStyle={{color:'white', backgroundColor:'brown'}}/>
                {cardList.map((item, key) => (
                  <RadioButton.Item label={item.cardnum} value={item.cardnum} labelStyle={{color:'white', backgroundColor:'brown'}} key={key}/>
                ))}
              </RadioButton.Group>
            </View>
            <Cell>
              <View>
                {(payment == 'Cash') ?
                  <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => Alert.alert('Success', `Payment Made To ${payment}`)}
                  >
                    <Text style={styles.infotext}> CONFIRM CASH PAYMENT</Text>
                  </TouchableOpacity>:
                  <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => navigation.navigate("Stripe", 
                                  {owner: route.params.owner, 
                                  connected: route.params.connected,
                                  totalCost: totalCost})}
                  >
                    <Text style={styles.infotext}> PROCEED TO STRIPE PAYMENT</Text>
                  </TouchableOpacity>
                }
              </View>
            </Cell>            
          </Section>
          <Divider width={5} color="darkgray" /> 
        </TableView>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

function DeliverScreen({route, navigation}) {

  const [offlineFlag, setOfflineFlag] = useState(false);
  const [addressList, setAddressList] = useState([]);
  const [delivery, setDelivery] = useState('In Store');

  const reqAddresses = async () => {
    // attempt to contact server 
    try {
      const response = await fetch(`${QRCODE_SERVER}/api/addresses`);
      const json = await response.json();
      setAddressList(json);
      //console.log(json);
    }
    catch(err) {
      console.log("SERVER ERROR! " + err);
    }
  }

  useEffect(() => {
    // check if network OK before automatically performing query
    if (route.params.connected = "CONNECTED") {
      console.log("Network OK, Making API Query");
      // get the delivery addresses from the API
      reqAddresses();
    } else {
      console.log("Problems With Network, Limited Functionality !!!")
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={{height:"100%"}}>
        <ImageBackground source={image} style={styles.image}>
          <TableView>
            <Section>
              <Text style={styles.headertext}>Deliver Screen QRcodeShopper</Text>
              <Text style={styles.connected}>{route.params.connected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
              </Text>
              <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
            </Section>
            <Divider width={5} color="darkgray" /> 
            <Section>
            <View>
              <Text styles={styles.label}>SELECT DELIVERY FROM OPTIONS :</Text>
            </View>
            <View>
              <RadioButton.Group onValueChange={value => setDelivery(value)} value={delivery}>
                <RadioButton.Item label="In Store" value="In Store" labelStyle={{color:'white', backgroundColor:'brown'}}/>
                {addressList.map((item, key) => (
                  <RadioButton.Item label={item.street} value={item.street} labelStyle={{color:'white', backgroundColor:'brown'}} key={key}/>
                ))}
              </RadioButton.Group>
            </View>
            <Cell>
              <TouchableOpacity 
                    style={styles.touchlink}
                    onPress={() => Alert.alert('Success', `Delivery Confirmed To ${delivery}`)}
                  >
                    <Text style={styles.infotext}>DELIVER TO '{delivery}'</Text>
                </TouchableOpacity>
            </Cell>
          </Section>
          <Divider width={5} color="darkgray" /> 
          </TableView>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsScreen({route, navigation}) {

  // this is a flag to force the app to be offline
  const [offlineFlag, setOfflineFlag] = useState(false);
  const [codes, setCodes] = useState([]);

  // set the offline status flag variable from local storage
  const setOfflineFlagStore = async () => {
    try {
      const item = JSON.parse(
        await Storage.getItem({ key: `$offlineFlag` })
      );
      setOfflineFlag(item);
    } catch(err) {
      console.log("RECALL ERROR! " + err);
    }
  }

  // store the offline status flag in local storage
  const storeOfflineFlag = async () => {
    try {
      // use this to store with key $offlineFlag
      await Storage.setItem({
        key: `$offlineFlag`,
        value: JSON.stringify(offlineFlag)
      });
    } catch(err) {
      console.log("STORE ERROR! " + err);
    }
  }

  const setCodesStore = async () => {
    try {
      const item = JSON.parse(
        await Storage.getItem({ key: `$codes` })
      );
      setCodes(item);
      //console.log(item);
    } catch(err) {
      console.log("RECALL ERROR! " + err);
    }
  }

  const zeroStores = async () => {
    try {
      // use this to store in key $sinfo
      await Storage.setItem({
        key: `$codes`,
        value: JSON.stringify([])
      });
      // update the state variables
      await setCodesStore();
    } catch(err) {
      console.log("STORE ERROR! " + err);
    }
  }

  const initStores = async () => {
    try {
      // use this to store in key $sinfo
      await Storage.setItem({
        key: `$codes`,
        value: JSON.stringify([
          {"code":"675566776"}, 
          {"code":"5017689065072"}
        ])
      });
      // update the state variables
      await setCodesStore();
    } catch(err) {
      console.log("STORE ERROR! " + err);
    }
  }

  useEffect(() => {
    //if offlineFlag state changes i.e. by manual intervention
    // store the value in a temporary variable
    storeOfflineFlag();
  }, [offlineFlag]);

  return (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView style={{height:"100%"}}>
      <ImageBackground source={image} style={styles.image}>
        <TableView>
          <Section>
            <Text style={styles.headertext}>Settings Screen QRcodeShopper</Text>
            <Text style={styles.connected}>{route.params.connected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
            </Text>
            <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
          </Section>
          <Divider width={5} color="darkgray" /> 
          <Section>
              <View>
                <Text styles={styles.label}>SELECT OFFLINE OPTION :</Text>
              </View>
              <Cell>
                <TouchableOpacity 
                  style={styles.touchlink}
                  onPress={() => {
                    setOfflineFlag(!offlineFlag);
                  }}
                >
                  <Text style={styles.infotext}>PRESS FOR {offlineFlag? 'ONLINE':'OFFLINE'} MODE</Text>
                </TouchableOpacity>
            </Cell>
          </Section>
          <Divider width={5} color="darkgray" /> 
          <Section>
            <View>
              <Text styles={styles.helptext}>EMPTY OFFLINE SCAN CODE STORAGE :</Text>
            </View>
            <View>
              <TouchableOpacity 
                style={styles.touchlink}
                onPress={zeroStores}
              >
                <Text style={styles.infotext}>PRESS TO EMPTY STORED QR CODES</Text>
              </TouchableOpacity>
            </View>
          </Section>
          <Divider width={5} color="darkgray" /> 
        </TableView>
      </ImageBackground>
    </ScrollView>
  </SafeAreaView>
  );
}

function DetailScreen({route, navigation}) {

  const [offlineFlag, setOfflineFlag] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={{height:"100%"}}>
        <ImageBackground source={image} style={styles.image}>
          <TableView>
            <Section>
              <Text style={styles.headertext}>Details Screen QRcodeShopper</Text>
              <Text style={styles.connected}>{route.params.connected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
              </Text>
              <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
            </Section>
            <Section>
              <Grid>
                <Row>
                  <Text style={styles.helptext}>{route.params.item.description} Product Details Screen</Text>
                </Row>
                <Row>
                  <Cell>
                    <Image
                      style={{margin:50,height:250, width:250, alignSelf: 'center'}}
                      source={{uri: `${QRCODE_SERVER}${route.params.item.thumbnail}`}}
                    />                  
                  </Cell>
                </Row>
                <Row>
                  <Text style={styles.boldtext}>Code : {route.params.item.code}</Text>
                </Row>
                <Row>
                  <Text style={styles.boldtext}>Description : {route.params.item.description}</Text>
                </Row>
                <Row>
                  <Text style={styles.boldtext}>Price : {route.params.item.price}</Text>
                </Row>
                <Row>
                  <Text style={styles.boldtext}>Quantity : {route.params.item.qty}</Text>
                </Row>
              </Grid>
            </Section>
          </TableView>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

function StripeScreen({route, navigation}) {

  const [offlineFlag, setOfflineFlag] = useState(false);
  const [name, setName] = useState('');
  const {confirmPayment, loading} = useConfirmPayment();
  const [card, setCard] = useState(null);

  const handlePayPress = async () => {
    const response = await fetch(`${QRCODE_SERVER}/api/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        paymentMethodType: 'card',
        currency: 'usd',
        amount:  (route.params.totalCost*100)
      })
    })
    const {clientSecret} = await response.json();
    //console.log(clientSecret);

    const {error, paymentIntent} = await confirmPayment(clientSecret, {
      type: 'Card',
      billingDetails: {name}
    })

    //console.log(paymentIntent);
    //console.log(error);
    if (error) {
      Alert.alert(`Error code: ${error.code}`, error.message)
    } else if (paymentIntent) {
      Alert.alert('Success', `Payment successful: ${paymentIntent.id}`)
    }
  }

  // set the card state variable from local storage
  const setCardStore = async () => {
    try {     
      const item = JSON.parse(
      await Storage.getItem({ key: `$card` })
    );
    setCard(item);
    } catch(err) {
      console.log("RECALL ERROR! " + err);
    }
  }

  // set the card state variable from local storage
  const getCardStore = async () => {
    try {
      const item = JSON.parse(
      await Storage.getItem({ key: `$card` })
      );
      return item;
    } catch(err) {
      console.log("RECALL ERROR! " + err);
      return {err};
    }
  }

  useEffect(() => {
    // check if network OK before automatically performing query
    if (route.params.connected = "CONNECTED") {
      console.log("Network OK, Making API Query");
    } else {
      console.log("Problems With Network, Limited Functionality !!!")
    };
    // get card details chosen previously
    setCardStore();
    console.log("setCardStore CALLED !!!");
  }, []);

// details of card data are :
// {item.id} {item.cardnum} {item.expiry} {item.signature}
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
        <ImageBackground source={image} style={styles.image}>
          <TableView>
            <Section>
              <Text style={styles.headertext}>Stripe Screen QRcodeShopper</Text>
              <Text style={styles.connected}>{route.params.connected ? "N/W AVAILABLE":"N/W UNAVAILABLE"}  !!!
              </Text>
              <Text style={styles.connected}>{offlineFlag ? "OFFLINE MODE":"ONLINE MODE"} !!!</Text>
            </Section>
            <Divider width={5} color="darkgray" /> 
            <Section>
              <Cell>
                <Text style={styles.helptext}>Credit Card Payment Screen</Text>
              </Cell>
              <Cell>
                <Text style={styles.helptext}>Card is {JSON.stringify(card)}</Text>
              </Cell>
            </Section>
            <Divider width={5} color="darkgray" /> 
            <Section>
              <TextInput 
                autoCapitalize='none'
                placeholder='Enter Name'
                keyboardType='name-phone-pad'
                onChange={(value) => setName(value.nativeEvent.text)}
                style={styles.input}
              />
              <CardField 
                postalCodeEnabled={false}
                placeholder={{
                  number:'4242 4242 4242 4242'
                }}
                style={styles.cardField}
                cardStyle={{
                  borderColor: '#000000',
                  borderWidth: 1,
                  borderRadius: 8
                }}
              />
              <TouchableOpacity 
                style={styles.touchlink} onPress={handlePayPress} disable={loading}
              >
                <Text style={styles.infotext}>PAY</Text>
              </TouchableOpacity>
            </Section>
            <Divider width={5} color="darkgray" /> 
          </TableView>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [publishableKey, setPublishableKey] = useState('');

  const reqPublishableKey = async () => {
    // attempt to contact server 
    try {
      const response = await fetch(`${QRCODE_SERVER}/api/pubkey`);
      const json = await response.json();
      setPublishableKey(json.publishableKey);
      //console.log(json);
    }
    catch(err) {
      console.log("SERVER ERROR! " + err);
    }
  }

  // use useEffect function to fetch the PublishableKey value from server
  useEffect(() => {
    // get the pubkey from the server
    reqPublishableKey();
  })

  return (
    <StripeProvider
      publishableKey={publishableKey}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} />
          <Stack.Screen name="List" component={ListScreen} />
          <Stack.Screen name="Pay" component={PayScreen} />
          <Stack.Screen name="Deliver" component={DeliverScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />          
          <Stack.Screen name="Detail" component={DetailScreen} />
          <Stack.Screen name="Stripe" component={StripeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connected: {
    alignSelf: 'center',
    color: 'white',
    backgroundColor: 'red',
  },
  label: {
    alignSelf: 'center',
    color: 'white',
    backgroundColor: 'green',
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 30,
  },
  helptext: {
    margin: 10,
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: 'orange',
  },
  headertext: {
    margin: 10,
    fontWeight: 'bold',
    fontSize: 24,
    backgroundColor: 'cyan',
    textAlign: 'center',
  },
  infotext: {
    margin: 1,
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  boldtext: {
    margin: 1,
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor: 'yellow',
    height: 40,
  },
  touchlink: {
    margin:1,
    backgroundColor: 'gold',
    borderWidth: 2,
    borderColor:'black',
    borderRadius:20,
    width: '100%',
    height: 40,
  },
  image: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
});
