import { Link } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';

export default function Login() {

  return (
    <View>
      <Image source={require('./../assets/images/login.jpeg')}
        style={{
            width:'100%',
            height:520
        }}
      />
      <View style={styles.container}>
        <Text style={{
                fontSize:30,
                fontFamily:'outfit-bold',
                textAlign:'center',
                marginTop:10
            }}>AI Travel Planner </Text>
            <Text style={{
                fontFamily:'outfit',
                fontSize:17,
                textAlign:'center',
                color:Colors.GRAY,
                marginTop:20

            }}>
                Discover your next adventure effortlessly.Personalized itineraries at your fingertips.Travel smarter with AI-driven insights.
            </Text>

            <Link href="auth/sign-in" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={{color:Colors.WHITE,
                    textAlign:'center',
                    fontFamily:'outfit',
                    fontSize:17
                }}>Get Started</Text>
              </TouchableOpacity>
            </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:{
    backgroundColor:Colors.WHITE,
    marginTop:-20,
    borderTopLeftRadius:30,
    borderTopRightRadius:30,
    height:'100%',
    padding:25
  },
  button:{
   padding:15,
   backgroundColor:Colors.PRIMARY,
   borderRadius:99,
   marginTop:'20%'
  }

})