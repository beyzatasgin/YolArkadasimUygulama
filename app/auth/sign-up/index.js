import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { auth } from './../../../configs/FirebaseConfig';
import { Colors } from './../../../constants/Colors';
export default function SignUp() {
  const navigation=useNavigation();
  const router=useRouter();
  const [email,setEmail]=useState();
  const [password,setPassword]=useState();
   const [fullName,setFullName]=useState();
  useEffect(()=>{
    navigation.setOptions({
      headerShown:false
    })
  },[navigation]);

  const OnCreateAccount=()=>{
   
    if(!email&&!password&&!fullName)
    {
      ToastAndroid.show('Lütfen tüm bilgileri girin',ToastAndroid.LONG);
      return;
    }

   createUserWithEmailAndPassword(auth, email, password)
  .then(async (userCredential) => {
    // Signed up 
    const user = userCredential.user;
    
    // Kullanıcı adını ayarla (fotoğraf boş kalacak)
    if (fullName) {
      try {
        await updateProfile(user, {
          displayName: fullName,
          // photoURL eklemiyoruz, böylece boş kalacak
        });
      } catch (error) {
        console.error('Profil güncelleme hatası:', error);
      }
    }
    
     router.replace('/mytrip')
    console.log(user);
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorMessage,errorCode);
    // ..
  });

  }

  return (
    <View
    style={{
      padding:25,
      paddingTop:50,
      backgroundColor:Colors.WHITE,
      height:'100%'

    }}
    >
      <TouchableOpacity onPress={()=>router.back()}>
      <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={{
        fontFamily:'outfit-bold',
        fontSize:30,
        marginTop:30

      }}>Yeni Hesap Oluştur</Text>
       {/* User Full Name*/}
       <View style={{
          marginTop:50
        }}>
           <Text style={{
            fontFamily:'outfit'
           }}> Ad Soyad  </Text>
           <TextInput
          style={styles.input}
          placeholder='Ad ve soyadınızı girin'
          onChangeText={(value)=>setFullName(value)}
          />
         </View>

      {/* Email*/}
        <View style={{
          marginTop:20
        }}>
           <Text style={{
            fontFamily:'outfit'
           }}>   E-posta  </Text>
           <TextInput
          style={styles.input}
          onChangeText={(value)=>setEmail(value)}
          placeholder='E-posta adresinizi girin'/>
         </View>
      {/* Password*/}
       <View style={{
          marginTop:20
        }}>
           <Text style={{
            fontFamily:'outfit'
           }}>  Şifre </Text>
           <TextInput
          secureTextEntry={true}
          style={styles.input}
          onChangeText={(value)=>setPassword(value)}
          placeholder='Şifrenizi girin'/>
          </View>

          {/*Create Account Button*/}
              <TouchableOpacity onPress={OnCreateAccount} style={{
                padding:15,
                backgroundColor:Colors.PRIMARY,
                borderRadius:15,
                marginTop:50
              }}>
                <Text style={{
                  color:Colors.WHITE,
                  textAlign:'center'
                }}>Hesap Oluştur</Text>
              </TouchableOpacity>
          
               {/*Sign In Button*/}
              <TouchableOpacity
                onPress={()=>router.replace('auth/sign-in')}
                style={{
                padding:15,
                backgroundColor:Colors.WHITE,
                borderRadius:15,
                marginTop:20,
                borderWidth:1
              }}>
                <Text style={{
                  color:Colors.PRIMARY,
                  textAlign:'center'
                }}>Giriş Yap</Text>
              </TouchableOpacity>
    </View>
  )
}
const styles = StyleSheet.create({
  input:{
   padding:15,
   borderWidth:1,
   borderRadius:15,
   borderColor:Colors.GRAY,
   fontFamily:'outfit'
  }
})