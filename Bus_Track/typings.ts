/* eslint-disable */
import {
  CollectionCustomizer,
  TAggregation,
  TConditionTree,
  TPaginatedFilter,
  TPartialRow,
  TSortClause
} from '@forestadmin/agent';

export type BusesCustomizer = CollectionCustomizer<Schema, 'buses'>;
export type BusesRecord = TPartialRow<Schema, 'buses'>;
export type BusesConditionTree = TConditionTree<Schema, 'buses'>;
export type BusesFilter = TPaginatedFilter<Schema, 'buses'>;
export type BusesSortClause = TSortClause<Schema, 'buses'>;
export type BusesAggregation = TAggregation<Schema, 'buses'>;

export type Buses_HistoryRecordsCustomizer = CollectionCustomizer<Schema, 'buses__historyRecords'>;
export type Buses_HistoryRecordsRecord = TPartialRow<Schema, 'buses__historyRecords'>;
export type Buses_HistoryRecordsConditionTree = TConditionTree<Schema, 'buses__historyRecords'>;
export type Buses_HistoryRecordsFilter = TPaginatedFilter<Schema, 'buses__historyRecords'>;
export type Buses_HistoryRecordsSortClause = TSortClause<Schema, 'buses__historyRecords'>;
export type Buses_HistoryRecordsAggregation = TAggregation<Schema, 'buses__historyRecords'>;

export type BusesRouteCustomizer = CollectionCustomizer<Schema, 'buses_route'>;
export type BusesRouteRecord = TPartialRow<Schema, 'buses_route'>;
export type BusesRouteConditionTree = TConditionTree<Schema, 'buses_route'>;
export type BusesRouteFilter = TPaginatedFilter<Schema, 'buses_route'>;
export type BusesRouteSortClause = TSortClause<Schema, 'buses_route'>;
export type BusesRouteAggregation = TAggregation<Schema, 'buses_route'>;

export type DriversCustomizer = CollectionCustomizer<Schema, 'drivers'>;
export type DriversRecord = TPartialRow<Schema, 'drivers'>;
export type DriversConditionTree = TConditionTree<Schema, 'drivers'>;
export type DriversFilter = TPaginatedFilter<Schema, 'drivers'>;
export type DriversSortClause = TSortClause<Schema, 'drivers'>;
export type DriversAggregation = TAggregation<Schema, 'drivers'>;

export type UsersCustomizer = CollectionCustomizer<Schema, 'users'>;
export type UsersRecord = TPartialRow<Schema, 'users'>;
export type UsersConditionTree = TConditionTree<Schema, 'users'>;
export type UsersFilter = TPaginatedFilter<Schema, 'users'>;
export type UsersSortClause = TSortClause<Schema, 'users'>;
export type UsersAggregation = TAggregation<Schema, 'users'>;


export type Schema = {
  'buses': {
    plain: {
      '_history': Array<number> | null;
      '_id': string;
      '_lastHistoryValue': number;
      '_lastLat': number;
      '_lastLng': number;
      '_lastMoveTime': number;
      '_speedHistory': Array<any> | null;
      'createdAt': string;
      'crowdExplanation': string;
      'crowdFlow': string;
      'currentStation': any | null;
      'etaSeconds': number | null;
      'etaText': string | null;
      'id': string;
      'isAtStation': boolean;
      'lat': number;
      'lng': number;
      'movement': string;
      'passengers': number;
      'targetStation': string;
      'updatedAt': string;
    };
    nested: {};
    flat: {};
  };
  'buses__historyRecords': {
    plain: {
      '_id': string;
      'p': number;
      'parentId': string;
      't': number;
    };
    nested: {
      'parent': Schema['buses']['plain'] & Schema['buses']['nested'];
    };
    flat: {
      'parent:_history': Array<number> | null;
      'parent:_id': string;
      'parent:_lastHistoryValue': number;
      'parent:_lastLat': number;
      'parent:_lastLng': number;
      'parent:_lastMoveTime': number;
      'parent:_speedHistory': Array<any> | null;
      'parent:createdAt': string;
      'parent:crowdExplanation': string;
      'parent:crowdFlow': string;
      'parent:currentStation': any | null;
      'parent:etaSeconds': number | null;
      'parent:etaText': string | null;
      'parent:id': string;
      'parent:isAtStation': boolean;
      'parent:lat': number;
      'parent:lng': number;
      'parent:movement': string;
      'parent:passengers': number;
      'parent:targetStation': string;
      'parent:updatedAt': string;
    };
  };
  'buses_route': {
    plain: {
      '_id': string;
      'lat': number;
      'lng': number;
      'parentId': string;
    };
    nested: {
      'parent': Schema['buses']['plain'] & Schema['buses']['nested'];
    };
    flat: {
      'parent:_history': Array<number> | null;
      'parent:_id': string;
      'parent:_lastHistoryValue': number;
      'parent:_lastLat': number;
      'parent:_lastLng': number;
      'parent:_lastMoveTime': number;
      'parent:_speedHistory': Array<any> | null;
      'parent:createdAt': string;
      'parent:crowdExplanation': string;
      'parent:crowdFlow': string;
      'parent:currentStation': any | null;
      'parent:etaSeconds': number | null;
      'parent:etaText': string | null;
      'parent:id': string;
      'parent:isAtStation': boolean;
      'parent:lat': number;
      'parent:lng': number;
      'parent:movement': string;
      'parent:passengers': number;
      'parent:targetStation': string;
      'parent:updatedAt': string;
    };
  };
  'drivers': {
    plain: {
      '_id': string;
      'busId': string;
      'capacity': number;
      'contactEmail': any | null;
      'contactPhone': any | null;
      'createdAt': string;
      'pinHash': string;
      'resetCode': string | null;
      'resetExpires': string | null;
      'updatedAt': string;
    };
    nested: {};
    flat: {};
  };
  'users': {
    plain: {
      '_id': string;
      'boardedAt': string | null;
      'createdAt': string;
      'currentBusId': string | null;
      'email': string;
      'isOnboard': boolean;
      'name': string;
      'passwordHash': string;
      'role': string;
      'updatedAt': string;
    };
    nested: {};
    flat: {};
  };
};
