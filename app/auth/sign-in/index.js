import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { auth } from './../../../configs/FirebaseConfig';
import { Colors } from './../../../constants/Colors';
export default function SignIn() {
  const navigation=useNavigation();
  const router=useRouter();

  const [email,setEmail]=useState();
  const [password,setPassword]=useState();
  

  useEffect(()=>{
   navigation.setOptions({
    headerShown:false
   })
  },[navigation])

  const onSignIn=()=>{

   if(!email || !password)
    {
      ToastAndroid.show('Lütfen E-posta ve Şifre girin',ToastAndroid.LONG);
      return;
    }

   signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Signed in 
    const user = userCredential.user;
    router.replace('/mytrip')
    console.log(user);
    // ...
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(errorMessage,errorCode)
    if(errorCode==='auth/invalid-credential')
    {
      
      ToastAndroid.show("Geçersiz kullanıcı adı veya şifre",ToastAndroid.LONG)
    }
  });
  }

  return (
    <View style={{
      padding:25,
      paddingTop:40,
      backgroundColor:Colors.WHITE,
      height:'100%'
      
    }}>
      <TouchableOpacity onPress={()=>router.back()}>
      <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={{
        fontFamily:'outfit-bold',
        fontSize:30,
        marginTop:30
      }} >Giriş Yapalım</Text>
        <Text style={{
        fontFamily:'outfit',
        fontSize:30,
        color:Colors.GRAY,
        marginTop:20
      }} >Tekrar Hoş Geldiniz</Text>
          <Text style={{
        fontFamily:'outfit',
        fontSize:30,
        color:Colors.GRAY,
        marginTop:10
      }} >Sizi özledik!</Text>
{/* Email*/}
  <View style={{
    marginTop:50
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
   
    {/*Sign In Button*/}
    <TouchableOpacity onPress={onSignIn}style={{
      padding:15,
      backgroundColor:Colors.PRIMARY,
      borderRadius:15,
      marginTop:50
    }}>
      <Text style={{
        color:Colors.WHITE,
        textAlign:'center'
      }}>Giriş Yap</Text>
    </TouchableOpacity>

     {/*Create Account Button*/}
    <TouchableOpacity 
      onPress={()=>router.replace('auth/sign-up')}
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
      }}>Hesap Oluştur</Text>
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
