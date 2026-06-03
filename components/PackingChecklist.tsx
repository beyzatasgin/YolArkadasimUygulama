import Ionicons from "@expo/vector-icons/Ionicons";
import { doc, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../configs/FirebaseConfig";
import type { PackingCategory } from "../types/ai";

const ACCENT = "#6366F1";
const SUCCESS = "#10B981";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#9CA3AF";

const CATEGORY_ICONS: Record<string, string> = {
  "Belgeler":       "document-text",
  "Giysi":          "shirt",
  "Sağlık & Hijyen":"medkit",
  "Elektronik":     "phone-portrait",
  "Diğer":          "bag",
};

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "checkmark-circle";
}

type CheckedMap = Record<string, boolean>;

type Props = {
  tripId: string;
  packingList: PackingCategory[];
  initialChecked?: CheckedMap;
};

function itemKey(category: string, item: string) {
  return `${category}::${item}`;
}

export default function PackingChecklist({
  tripId,
  packingList,
  initialChecked = {},
}: Props) {
  const [checked, setChecked] = useState<CheckedMap>(initialChecked);
  const [customItems, setCustomItems] = useState<PackingCategory[]>([]);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge original + custom into display list
  const displayList: PackingCategory[] = useMemo(() => {
    const merged: Record<string, string[]> = {};
    for (const cat of packingList) {
      merged[cat.category] = [...cat.items];
    }
    for (const cat of customItems) {
      if (merged[cat.category]) {
        merged[cat.category] = [...merged[cat.category], ...cat.items];
      } else {
        merged[cat.category] = [...cat.items];
      }
    }
    return Object.entries(merged).map(([category, items]) => ({ category, items }));
  }, [packingList, customItems]);

  const totalItems = useMemo(
    () => displayList.reduce((s, c) => s + c.items.length, 0),
    [displayList],
  );
  const checkedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked],
  );

  // Debounced Firestore save
  const persistChecked = useCallback(
    (next: CheckedMap) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        try {
          await updateDoc(doc(db, "trips", tripId), {
            packingChecked: next,
          });
        } catch {
          // silently fail — offline tolerance
        }
      }, 800);
    },
    [tripId],
  );

  const toggle = useCallback(
    (category: string, item: string) => {
      const key = itemKey(category, item);
      setChecked((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persistChecked(next);
        return next;
      });
    },
    [persistChecked],
  );

  const addCustomItem = useCallback(
    (category: string) => {
      const text = newItemText.trim();
      if (!text) return;
      setCustomItems((prev) => {
        const existing = prev.find((c) => c.category === category);
        if (existing) {
          return prev.map((c) =>
            c.category === category
              ? { ...c, items: [...c.items, text] }
              : c,
          );
        }
        return [...prev, { category, items: [text] }];
      });
      setNewItemText("");
      setAddingCategory(null);
      Keyboard.dismiss();
    },
    [newItemText],
  );

  const removeCustomItem = useCallback(
    (category: string, item: string) => {
      Alert.alert("Öğeyi Sil", `"${item}" listeden kaldırılsın mı?`, [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaldır",
          style: "destructive",
          onPress: () => {
            setCustomItems((prev) =>
              prev
                .map((c) =>
                  c.category === category
                    ? { ...c, items: c.items.filter((i) => i !== item) }
                    : c,
                )
                .filter((c) => c.items.length > 0),
            );
            // uncheck if was checked
            setChecked((prev) => {
              const next = { ...prev };
              delete next[itemKey(category, item)];
              persistChecked(next);
              return next;
            });
          },
        },
      ]);
    },
    [persistChecked],
  );

  const progress = totalItems > 0 ? checkedCount / totalItems : 0;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {checkedCount}/{totalItems} hazırlandı
        </Text>
        <Text style={[styles.progressPct, { color: progress === 1 ? SUCCESS : ACCENT }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      {progress === 1 && (
        <View style={styles.allDoneBanner}>
          <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
          <Text style={styles.allDoneText}>Tüm eşyalar hazır! Güzel yolculuklar 🎉</Text>
        </View>
      )}

      {/* Categories */}
      {displayList.map((cat) => (
        <CategorySection
          key={cat.category}
          cat={cat}
          checked={checked}
          onToggle={toggle}
          onRemoveCustom={(item) => {
            // only allow removing items that are in customItems
            const isCustom = customItems.find((c) => c.category === cat.category)?.items.includes(item);
            if (isCustom) removeCustomItem(cat.category, item);
          }}
          isCustomItem={(item) =>
            !!customItems.find((c) => c.category === cat.category)?.items.includes(item)
          }
          addingCategory={addingCategory}
          setAddingCategory={setAddingCategory}
          newItemText={newItemText}
          setNewItemText={setNewItemText}
          onAddItem={() => addCustomItem(cat.category)}
        />
      ))}
    </View>
  );
}

/* ── CategorySection ── */
function CategorySection({
  cat,
  checked,
  onToggle,
  onRemoveCustom,
  isCustomItem,
  addingCategory,
  setAddingCategory,
  newItemText,
  setNewItemText,
  onAddItem,
}: {
  cat: PackingCategory;
  checked: CheckedMap;
  onToggle: (cat: string, item: string) => void;
  onRemoveCustom: (item: string) => void;
  isCustomItem: (item: string) => boolean;
  addingCategory: string | null;
  setAddingCategory: (c: string | null) => void;
  newItemText: string;
  setNewItemText: (t: string) => void;
  onAddItem: () => void;
}) {
  const catChecked = cat.items.filter((i) => checked[itemKey(cat.category, i)]).length;
  const allDone = catChecked === cat.items.length;

  return (
    <View style={styles.category}>
      {/* Category header */}
      <View style={styles.categoryHeader}>
        <View style={[styles.catIconBox, allDone && styles.catIconBoxDone]}>
          <Ionicons
            name={getCategoryIcon(cat.category) as any}
            size={16}
            color={allDone ? SUCCESS : ACCENT}
          />
        </View>
        <Text style={styles.categoryTitle}>{cat.category}</Text>
        <Text style={styles.catCount}>
          {catChecked}/{cat.items.length}
        </Text>
      </View>

      {/* Items */}
      {cat.items.map((item) => {
        const key = itemKey(cat.category, item);
        const isChecked = !!checked[key];
        const custom = isCustomItem(item);
        return (
          <CheckItem
            key={key}
            label={item}
            checked={isChecked}
            onToggle={() => onToggle(cat.category, item)}
            onRemove={custom ? () => onRemoveCustom(item) : undefined}
          />
        );
      })}

      {/* Add item row */}
      {addingCategory === cat.category ? (
        <View style={styles.addRow}>
          <TextInput
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder="Yeni eşya..."
            placeholderTextColor={TEXT_MUTED}
            style={styles.addInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={onAddItem}
          />
          <TouchableOpacity onPress={onAddItem} style={styles.addConfirmBtn}>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setAddingCategory(null); setNewItemText(""); }}
            style={styles.addCancelBtn}
          >
            <Ionicons name="close" size={18} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => { setAddingCategory(cat.category); setNewItemText(""); }}
          style={styles.addTrigger}
        >
          <Ionicons name="add-circle-outline" size={15} color={ACCENT} />
          <Text style={styles.addTriggerText}>Ekle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── CheckItem ── */
function CheckItem({
  label,
  checked,
  onToggle,
  onRemove,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: checked ? 1 : 0,
      useNativeDriver: false,
      friction: 6,
    }).start();
  }, [checked]);

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ["#F3F4F6", SUCCESS] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.itemRow}>
      <Animated.View style={[styles.checkbox, { backgroundColor: bg, transform: [{ scale }] }]}>
        {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
      </Animated.View>
      <Text style={[styles.itemLabel, checked && styles.itemLabelChecked]}>
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={16} color="#D1D5DB" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, marginTop: 4 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontFamily: "outfit-medium", fontSize: 13, color: TEXT_PRIMARY },
  progressPct:   { fontFamily: "outfit-bold",   fontSize: 13 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  allDoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  allDoneText: { fontFamily: "outfit-medium", fontSize: 13, color: "#065F46" },
  category: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 6,
  },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  catIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  catIconBoxDone: { backgroundColor: "#ECFDF5" },
  categoryTitle: { fontFamily: "outfit-bold", fontSize: 14, color: TEXT_PRIMARY, flex: 1 },
  catCount:      { fontFamily: "outfit", fontSize: 12, color: TEXT_MUTED },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 3 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  itemLabel:        { fontFamily: "outfit", fontSize: 14, color: TEXT_PRIMARY, flex: 1 },
  itemLabelChecked: { textDecorationLine: "line-through", color: TEXT_MUTED },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: "outfit",
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: "#fff",
  },
  addConfirmBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
  },
  addCancelBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  addTrigger: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, alignSelf: "flex-start" },
  addTriggerText: { fontFamily: "outfit-medium", fontSize: 12, color: ACCENT },
});
