import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { HeaderBar } from '../components/HeaderBar';

interface GroupingItem {
  id: string;
  name: string;
  subtext?: string;
  count: number;
}

interface GroupingListScreenProps {
  title: string;
  items: GroupingItem[];
  icon: keyof typeof Ionicons.glyphMap;
  onSelectItem: (item: GroupingItem) => void;
}

export const GroupingListScreen: React.FC<GroupingListScreenProps> = ({
  title,
  items,
  icon,
  onSelectItem,
}) => {
  const { theme, selectedIndex, setSelectedIndex, registerCenterAction } = useMusicPlayer();
  const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, items.length - 1));

  useEffect(() => {
    registerCenterAction(() => {
      const selected = items[clampedIndex];
      if (selected) {
        onSelectItem(selected);
      }
    });

    return () => {
      registerCenterAction(null);
    };
  }, [clampedIndex, items, onSelectItem, registerCenterAction]);

  return (
    <View style={[styles.container, { backgroundColor: theme.screenBackground }]}>
      <HeaderBar title={`${title} (${items.length})`} />

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={icon} size={48} color={theme.screenSubtext} />
          <Text style={[styles.emptyTitle, { color: theme.screenText }]}>No {title}</Text>
          <Text style={[styles.emptyDesc, { color: theme.screenSubtext }]}>
            Import audio files to organize your collection by {title.toLowerCase()}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const isSelected = index === clampedIndex;

            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedIndex(index);
                  onSelectItem(item);
                }}
                style={styles.itemWrapper}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={theme.screenHighlightBar as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.highlightBar}
                  >
                    <View style={styles.leftRow}>
                      <Ionicons
                        name={icon}
                        size={16}
                        color={theme.screenHighlightText}
                        style={styles.iconMargin}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.itemTitle, { color: theme.screenHighlightText }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </Text>
                        {item.subtext && (
                          <Text
                            style={[
                              styles.itemSubtext,
                              { color: theme.screenHighlightText + 'CC' },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.subtext}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.rightRow}>
                      <Text
                        style={[styles.countText, { color: theme.screenHighlightText + 'CC' }]}
                      >
                        {item.count} {item.count === 1 ? 'song' : 'songs'}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.screenHighlightText} />
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.normalBar}>
                    <View style={styles.leftRow}>
                      <Ionicons
                        name={icon}
                        size={16}
                        color={theme.screenSubtext}
                        style={styles.iconMargin}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.itemTitle, { color: theme.screenText }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </Text>
                        {item.subtext && (
                          <Text
                            style={[styles.itemSubtext, { color: theme.screenSubtext }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.subtext}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.rightRow}>
                      <Text style={[styles.countText, { color: theme.screenSubtext }]}>
                        {item.count} {item.count === 1 ? 'song' : 'songs'}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.screenSubtext} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemWrapper: {
    height: 40,
    justifyContent: 'center',
  },
  highlightBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  normalBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconMargin: {
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemSubtext: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
