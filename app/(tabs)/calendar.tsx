import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../src/constants";
import {
  deleteEvent,
  getAllEvents,
  getAllShifts,
} from "../../src/services/database";
import { cancelEventNotifications } from "../../src/services/notification";
import { doTimesOverlap, parseTimeToMinutes } from "../../src/utils/time";

const SCREEN_W = Dimensions.get("window").width;
const PX_PER_HOUR = 64;
const START_HOUR = 0;
const END_HOUR = 24;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);
const TIME_COL = 44;
const DAY_COLS = 7;

interface CalItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "shift" | "event";
  notes?: string | null;
}

function getWeekDays(base: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    return d;
  });
}
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function yForTime(time: string): number {
  const mins = parseTimeToMinutes(time);
  return ((mins - START_HOUR * 60) / 60) * PX_PER_HOUR;
}

function heightForTimes(start: string, end: string): number {
  const diff = parseTimeToMinutes(end) - parseTimeToMinutes(start);
  return Math.max((diff / 60) * PX_PER_HOUR, 20);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function CalendarScreen() {
  const router = useRouter();
  const [view, setView] = useState<"week" | "month">("week");
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [items, setItems] = useState<CalItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const load = async () => {
    const shifts = (await getAllShifts()) as any[];
    const events = (await getAllEvents()) as any[];
    const mapped: CalItem[] = [
      ...shifts.map((s) => ({
        ...s,
        title: s.role ?? "Shift",
        type: "shift" as const,
      })),
      ...events.map((e) => ({ ...e, type: "event" as const })),
    ];
    setItems(mapped);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: PX_PER_HOUR * 3, animated: false });
    }, 100);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const weekDays = getWeekDays(baseDate);
  const monthDays = getMonthDays(baseDate.getFullYear(), baseDate.getMonth());

  const itemsForDate = (dateStr: string) =>
    items.filter((i) => i.date === dateStr);

  const hasConflict = (item: CalItem, dateStr: string) =>
    items.some(
      (other) =>
        other.id !== item.id &&
        other.date === dateStr &&
        doTimesOverlap(
          item.startTime,
          item.endTime,
          other.startTime,
          other.endTime,
        ),
    );

  const handleDeleteEvent = (item: CalItem) => {
    if (item.type !== "event") return;
    Alert.alert("Delete Event", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await cancelEventNotifications(item.id);
          await deleteEvent(item.id);
          load();
        },
      },
    ]);
  };

  const dayColW = (SCREEN_W - 40 - TIME_COL) / DAY_COLS;

  const navigate = (dir: number) => {
    if (view === "week") {
      setBaseDate(
        (prev) =>
          new Date(
            prev.getFullYear(),
            prev.getMonth(),
            prev.getDate() + dir * 7,
          ),
      );
    } else {
      setBaseDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1),
      );
    }
  };

  const todayStr = toDateStr(new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/modal/add-event")}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === "week" && styles.toggleActive]}
          onPress={() => setView("week")}
        >
          <Text
            style={[
              styles.toggleText,
              view === "week" && styles.toggleTextActive,
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === "month" && styles.toggleActive]}
          onPress={() => setView("month")}
        >
          <Text
            style={[
              styles.toggleText,
              view === "month" && styles.toggleTextActive,
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigate(-1)}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navLabel}>
          {view === "week"
            ? `${weekDays[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
            : `${MONTH_LABELS[baseDate.getMonth()]} ${baseDate.getFullYear()}`}
        </Text>
        <TouchableOpacity onPress={() => navigate(1)}>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Week view */}
      {view === "week" && (
        <>
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            <View style={{ width: TIME_COL }} />
            {weekDays.map((d, i) => {
              const isToday = toDateStr(d) === todayStr;
              return (
                <View key={i} style={[styles.dayHeader, { width: dayColW }]}>
                  <Text style={styles.dayHeaderLabel}>
                    {d
                      .toLocaleDateString("en-AU", { weekday: "short" })
                      .toUpperCase()}
                  </Text>
                  <View
                    style={[styles.dayNumWrap, isToday && styles.todayCircle]}
                  >
                    <Text
                      style={[styles.dayHeaderNum, isToday && styles.todayNum]}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <ScrollView ref={scrollRef} style={{ flex: 1 }}>
            <View style={styles.timelineContainer}>
              {/* Hour lines + labels */}
              {HOURS.map((h) => (
                <View
                  key={h}
                  style={[
                    styles.hourRow,
                    { top: (h - START_HOUR) * PX_PER_HOUR },
                  ]}
                >
                  <Text style={styles.hourLabel}>
                    {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                  </Text>
                  <View style={styles.hourLine} />
                </View>
              ))}

              {/* Day columns */}
              {weekDays.map((d, di) => {
                const dateStr = toDateStr(d);
                const dayItems = itemsForDate(dateStr);
                return (
                  <View
                    key={di}
                    style={[
                      styles.dayCol,
                      { left: TIME_COL + di * dayColW, width: dayColW },
                    ]}
                  >
                    {dayItems.map((item) => {
                      const conflict = hasConflict(item, dateStr);
                      const top = yForTime(item.startTime);
                      const height = heightForTimes(
                        item.startTime,
                        item.endTime,
                      );
                      const isShift = item.type === "shift";
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.block,
                            { top, height, width: dayColW - 4 },
                            isShift ? styles.shiftBlock : styles.eventBlock,
                            conflict && styles.conflictBlock,
                          ]}
                          onLongPress={() => handleDeleteEvent(item)}
                        >
                          <Text style={styles.blockTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {conflict && (
                            <View style={styles.conflictPill}>
                              <Text style={styles.conflictPillText}>
                                Conflict
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}

              {/* Total height spacer */}
              <View style={{ height: (END_HOUR - START_HOUR) * PX_PER_HOUR }} />
            </View>
          </ScrollView>
        </>
      )}

      {/* Month view */}
      {view === "month" && (
        <ScrollView>
          {/* Weekday labels */}
          <View style={styles.monthWeekRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.monthWeekLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.monthGrid}>
            {monthDays.map((d, i) => {
              if (!d) return <View key={i} style={styles.monthCell} />;
              const dateStr = toDateStr(d);
              const dayItems = itemsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const hasShift = dayItems.some((x) => x.type === "shift");
              const hasEvent = dayItems.some((x) => x.type === "event");
              const conflict = dayItems.some((item) =>
                hasConflict(item, dateStr),
              );

              return (
                <View
                  key={i}
                  style={[styles.monthCell, isToday && styles.todayCell]}
                >
                  <Text
                    style={[styles.monthDayNum, isToday && styles.todayNum]}
                  >
                    {d.getDate()}
                  </Text>
                  <View style={styles.dotRow}>
                    {hasShift && (
                      <View
                        style={[styles.dot, { backgroundColor: COLORS.blue }]}
                      />
                    )}
                    {hasEvent && (
                      <View
                        style={[styles.dot, { backgroundColor: COLORS.green }]}
                      />
                    )}
                    {conflict && (
                      <View
                        style={[styles.dot, { backgroundColor: COLORS.red }]}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.blue }]} />
          <Text style={styles.legendText}>Shift</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
          <Text style={styles.legendText}>Event</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
          <Text style={styles.legendText}>Conflict</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "700" },
  addBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  toggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleActive: { backgroundColor: COLORS.blue },
  toggleText: { color: COLORS.textSecond, fontSize: 13, fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  navLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  dayHeaders: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 4 },
  dayHeader: { alignItems: "center" },
  dayHeaderLabel: { color: COLORS.textSecond, fontSize: 11, marginBottom: 2 },
  dayNumWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  dayHeaderNum: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "500" },
  todayCircle: { backgroundColor: COLORS.blue },
  todayNum: { color: "#fff", fontWeight: "700" },
  timelineContainer: { marginHorizontal: 16, position: "relative" },
  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    height: PX_PER_HOUR,
  },
  hourLabel: {
    width: TIME_COL,
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: "right",
    paddingRight: 6,
  },
  hourLine: { flex: 1, height: 0.5, backgroundColor: COLORS.border },
  dayCol: { position: "absolute", top: 0, bottom: 0 },
  block: {
    position: "absolute",
    left: 2,
    borderRadius: 6,
    padding: 3,
    overflow: "hidden",
  },
  shiftBlock: { backgroundColor: `${COLORS.blue}CC` },
  eventBlock: { backgroundColor: `${COLORS.green}CC` },
  conflictBlock: { borderWidth: 2, borderColor: COLORS.red },
  blockTitle: { color: "#fff", fontSize: 10, fontWeight: "600" },
  conflictPill: {
    backgroundColor: COLORS.red,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  conflictPillText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  monthWeekRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  monthWeekLabel: {
    flex: 1,
    textAlign: "center",
    color: COLORS.textSecond,
    fontSize: 11,
    fontWeight: "600",
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  monthCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 4,
  },
  todayCell: { backgroundColor: `${COLORS.blue}22` },
  monthDayNum: { color: COLORS.textPrimary, fontSize: 13 },
  dotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: COLORS.textSecond, fontSize: 12 },
});
