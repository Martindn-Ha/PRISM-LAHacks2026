#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <HealthKit/HealthKit.h>

@interface HealthKitGlucoseObserver : RCTEventEmitter <RCTBridgeModule>
@property (nonatomic, strong) HKHealthStore *healthStore;
@property (nonatomic, strong) HKObserverQuery *observerQuery;
@end

@implementation HealthKitGlucoseObserver

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"glucoseSamplesUpdated" ];
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    if ([HKHealthStore isHealthDataAvailable]) {
      _healthStore = [[HKHealthStore alloc] init];
    }
  }
  return self;
}

RCT_EXPORT_METHOD(startGlucoseObserver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  if (!self.healthStore) {
    reject(@"healthkit_unavailable", @"HealthKit is not available on this device.", nil);
    return;
  }

  HKQuantityType *glucoseType = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierBloodGlucose];
  if (!glucoseType) {
    reject(@"healthkit_type_missing", @"Blood glucose type is unavailable.", nil);
    return;
  }

  if (self.observerQuery) {
    resolve(@(YES));
    return;
  }

  __weak typeof(self) weakSelf = self;
  self.observerQuery = [[HKObserverQuery alloc] initWithSampleType:glucoseType predicate:nil updateHandler:^(HKObserverQuery *query, HKObserverQueryCompletionHandler completionHandler, NSError *error) {
    __strong typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf) {
      [strongSelf sendEventWithName:@"glucoseSamplesUpdated" body:@{ @"reason": @"observer" }];
    }
    if (completionHandler) {
      completionHandler();
    }
  }];

  [self.healthStore executeQuery:self.observerQuery];

  [self.healthStore enableBackgroundDeliveryForType:glucoseType frequency:HKUpdateFrequencyImmediate withCompletion:^(BOOL success, NSError *error) {
    if (success) {
      resolve(@(YES));
    } else {
      reject(@"background_delivery_failed", error.localizedDescription ?: @"Failed to enable background delivery.", error);
    }
  }];
}

RCT_EXPORT_METHOD(stopGlucoseObserver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.observerQuery && self.healthStore) {
    [self.healthStore stopQuery:self.observerQuery];
    self.observerQuery = nil;
  }
  resolve(@(YES));
}

@end
