import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../configs/FirebaseConfig";
import { sendChatMessage, type ChatMessage, type TripContext } from "../services/chatService";

const ACCENT = "#6366F1";
const DARK_BG = "#0A0F1E";

// Hızlı soru önerileri
const QUICK_QUESTIONS = [
  "Vize gerekiyor mu?",
  "Para birimi nedir?",
  "En iyi gezi mevsimi hangisi?",
  "Ulaşım nasıl?",
  "Güvenli mi?",
  "Yerel yemekler neler?",
  "Hava nasıl olur?",
  "Kaç gün yeterli?",
];

export default function AiChat() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    tripId?: string;
    placeName?: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    travelers?: string;
    interests?: string;
  }>();

  const tripId = params.tripId || null;

  const tripContext: TripContext | undefined = params.placeName
    ? {
        placeName: params.placeName,
        startDate: params.startDate,
        endDate: params.endDate,
        duration: params.duration ? parseInt(params.duration) : undefined,
        travelers: params.travelers ? parseInt(params.travelers) : undefined,
        interests: params.interests ? JSON.parse(params.interests) : undefined,
      }
    : undefined;

  // useMemo ile sabit tut — dependency array'de kullanılabilsin
  const welcomeMessage: ChatMessage = useMemo(() => ({
    id: "welcome",
    role: "assistant",
    content: tripContext?.placeName
      ? `Merhaba! ✈️ ${tripContext.placeName} seyahatin için buradayım. Vize, hava durumu, ulaşım, yerel kültür veya aklına takılan her şeyi sorabilirsin!`
      : "Merhaba! ✈️ Ben Yol Arkadaşım AI asistanıyım. Seyahat planlaması, destinasyonlar, vize bilgisi ve daha fazlası hakkında sana yardımcı olabilirim. Ne öğrenmek istersin?",
    timestamp: new Date(),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  // Yükleme sonrası ilk save tetiklenmesini önler
  const justLoadedRef = useRef(false);

  // Firestore'dan geçmiş mesajları yükle
  useEffect(() => {
    if (!tripId || !db || !auth?.currentUser) {
      setHistoryLoaded(true);
      return;
    }
    const loadHistory = async () => {
      try {
        if (!db) return;
        const snap = await getDoc(doc(db, "trips", tripId));
        if (snap.exists()) {
          const saved = snap.data()?.chatHistory;
          if (Array.isArray(saved) && saved.length > 0) {
            const restored: ChatMessage[] = saved.map((m: any) => ({
              ...m,
              timestamp: m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp),
            }));
            justLoadedRef.current = true;
            setMessages(restored);
          }
        }
      } catch {}
      setHistoryLoaded(true);
    };
    loadHistory();
  }, [tripId]);

  // Mesajlar değişince Firestore'a kaydet (geçmiş yüklendikten sonra)
  useEffect(() => {
    if (!tripId || !db || !auth?.currentUser || !historyLoaded) return;
    // İlk yükleme sonrası gereksiz tekrar yazmayı atla
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    const serialized = messages.map((m) => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    }));
    if (db) updateDoc(doc(db, "trips", tripId), { chatHistory: serialized }).catch(() => {});
  }, [messages, tripId, historyLoaded]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      "Sohbeti Temizle",
      "Tüm mesajlar silinecek. Emin misin?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Temizle",
          style: "destructive",
          onPress: () => {
            setMessages([welcomeMessage]);
            if (tripId && db && auth?.currentUser) {
              updateDoc(doc(db, "trips", tripId), { chatHistory: [] }).catch(() => {});
            }
          },
        },
      ],
    );
  }, [tripId, welcomeMessage]);

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text || inputText).trim();
      if (!message || loading) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setLoading(true);
      scrollToBottom();

      try {
        const historyWithoutWelcome = messages.filter((m) => m.id !== "welcome");
        const response = await sendChatMessage(
          message,
          historyWithoutWelcome,
          tripContext,
        );

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        scrollToBottom();
      } catch (err: any) {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar dene.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [inputText, loading, messages, scrollToBottom, tripContext],
  );

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, isUser ? { color: "rgba(255,255,255,0.6)" } : { color: "#9CA3AF" }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Seyahat Asistanı</Text>
            {tripContext?.placeName && (
              <Text style={styles.headerSub}>📍 {tripContext.placeName}</Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {tripId && messages.length > 1 && (
            <TouchableOpacity
              onPress={handleClearHistory}
              style={[styles.backButton, { backgroundColor: "rgba(239,68,68,0.25)" }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={17} color="#FCA5A5" />
            </TouchableOpacity>
          )}
          <View style={styles.onlineDot} />
        </View>
      </View>

      {/* Mesajlar */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingRow}>
              <View style={styles.avatarCircle}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.typingText}>Yanıt yazıyor...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Hızlı sorular — sadece ilk mesajda göster */}
      {messages.length <= 1 && (
        <View style={styles.quickContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {QUICK_QUESTIONS.map((q) => (
              <TouchableOpacity
                key={q}
                onPress={() => handleSend(q)}
                style={styles.quickChip}
              >
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Bir şey sor..."
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={() => handleSend()}
          style={[
            styles.sendButton,
            (!inputText.trim() || loading) && styles.sendButtonDisabled,
          ]}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FB" },

  /* Header */
  header: {
    backgroundColor: DARK_BG,
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontFamily: "outfit-bold",
    fontSize: 16,
    color: "#fff",
  },
  headerSub: {
    fontFamily: "outfit",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: DARK_BG,
  },

  /* Mesajlar */
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAssistant: { justifyContent: "flex-start" },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 4,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleAssistant: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleText: {
    fontFamily: "outfit",
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: { color: "#fff" },
  bubbleTextAssistant: { color: "#111827" },
  timeText: {
    fontFamily: "outfit",
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },

  /* Typing */
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingText: {
    fontFamily: "outfit",
    fontSize: 13,
    color: "#9CA3AF",
  },

  /* Hızlı sorular */
  quickContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  quickChip: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  quickChipText: {
    fontFamily: "outfit-medium",
    fontSize: 13,
    color: ACCENT,
  },

  /* Input */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: "#F5F7FB",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "outfit",
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
});
