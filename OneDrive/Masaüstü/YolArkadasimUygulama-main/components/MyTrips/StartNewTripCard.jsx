import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CreateTripContext, defaultTripData } from '../../context/CreateTripContext';

export default function StartNewTripCard() {
   const router = useRouter();
   const { setTripData } = useContext(CreateTripContext);

   const handleStartNewTrip = () => {
     // Context'i temizle - yeni seyahat için
     setTripData(defaultTripData);
     router.push('/create-trip/search-place');
   };

  return (
    <View 
    style={{
        padding:50,
        marginTop:50,
        display:'flex',
        alignItems:'center',
        gap:25
    }}>
  <Ionicons name="location-sharp" size={30} color={Colors.PRIMARY} />
   <Text style={{
    fontSize:25,
    fontFamily:'outfit-medium'
 }}>
    Henüz Planlanmış Seyahat Yok
 </Text>

  <Text style={{
    fontSize:20,
    fontFamily:'outfit',
    textAlign:'center',
    color:Colors.GRAY
  }}>
    Yeni bir seyahat deneyimi planlama zamanı geldi! Aşağıdan başlayın
 </Text>
 <TouchableOpacity 
 onPress={handleStartNewTrip}
 style ={{
    padding:15,
    backgroundColor:Colors.PRIMARY,
    borderRadius:15,
    paddingHorizontal:30

 }}>
    <Text style={{
        color:Colors.WHITE,
        fontFamily:'outfit-medium',
        fontSize:17
    }}>
        Yeni Seyahat Başlat
    </Text>
 </TouchableOpacity>
    </View>
  )
}