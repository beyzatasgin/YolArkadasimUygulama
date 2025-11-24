import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Login() {

  return (
    <View style={{ flex: 1 }}>
      {/* Modern Gradient Background */}
      <View style={styles.backgroundContainer}>
        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />
        
        {/* Dünya ve Seyahat İkonları */}
        <View style={styles.iconContainer}>
          {/* Ana Dünya İkonu */}
          <View style={styles.globeWrapper}>
            <Ionicons name="globe" size={140} color={Colors.PRIMARY} style={styles.globeIcon} />
          </View>
          
          {/* Uçan İkonlar */}
          <View style={styles.floatingIcons}>
            <View style={[styles.iconBubble, { top: 40, left: 20 }]}>
              <Ionicons name="airplane" size={32} color={Colors.PRIMARY} />
            </View>
            <View style={[styles.iconBubble, { top: 70, right: 30 }]}>
              <Ionicons name="location" size={28} color="#EF4444" />
            </View>
            <View style={[styles.iconBubble, { top: 100, left: 40 }]}>
              <Ionicons name="camera" size={26} color="#F59E0B" />
            </View>
            <View style={[styles.iconBubble, { top: 130, right: 20 }]}>
              <Ionicons name="map" size={28} color="#10B981" />
            </View>
            <View style={[styles.iconBubble, { top: 160, left: 60 }]}>
              <Ionicons name="restaurant" size={24} color="#8B5CF6" />
            </View>
            <View style={[styles.iconBubble, { top: 50, right: 60 }]}>
              <Ionicons name="bed" size={26} color="#06B6D4" />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.container}>
        <Text style={{
                fontSize:32,
                fontFamily:'outfit-bold',
                textAlign:'center',
                marginTop:10,
                color: Colors.PRIMARY
            }}>Yol Arkadaşım</Text>
            <Text style={{
                fontFamily:'outfit',
                fontSize:17,
                textAlign:'center',
                color:Colors.GRAY,
                marginTop:20

            }}>
                Bir sonraki maceranızı zahmetsizce keşfedin. Kişiselleştirilmiş seyahat planları parmaklarınızın ucunda. AI destekli önerilerle daha akıllı seyahat edin.
            </Text>

            <Link href="auth/sign-in" asChild>
              <TouchableOpacity style={styles.button}>
                <Text style={{color:Colors.WHITE,
                    textAlign:'center',
                    fontFamily:'outfit',
                    fontSize:17
                }}>Başlayın</Text>
              </TouchableOpacity>
            </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backgroundContainer: {
    width: '100%',
    height: 520,
    backgroundColor: '#E0F2FE', // Açık mavi arka plan
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  globeWrapper: {
    position: 'absolute',
    top: 180,
    left: '50%',
    marginLeft: -70,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 70,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  globeIcon: {
    opacity: 0.9,
  },
  floatingIcons: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  iconBubble: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
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