import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import StartNewTripCard from '../../components/MyTrips/StartNewTripCard';
import { Colors } from '../../constants/Colors';
export default function Mytrip() {

  const [userTrips,setUserTrips]=useState([]);
  return (
    <View style={{
      padding:25,
      paddingTop:55,
      backgroundColor:Colors.WHITE,
      height:'100%'
    }}>
      <View
      style={{
        display:'flex',
        flexDirection:'row',
        alignContent:'center',
        justifyContent:'space-between'
      }}
      >
      <Text style={{
        fontFamily:'outfit-bold',
        fontSize:35
      }}>My Trips</Text>
      <Ionicons name="add-circle" size={50} color={Colors.PRIMARY} />
      </View>
     {userTrips.length === 0 && <StartNewTripCard />}
    </View>
  )
}