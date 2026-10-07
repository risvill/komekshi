#import <UIKit/UIKit.h>
#import "AppDelegate.h"

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@end

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
willConnectToSession:(UISceneSession *)session
       options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  UIWindowScene *windowScene = (UIWindowScene *)scene;

  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  appDelegate.window.windowScene = windowScene;
}

- (void)sceneDidBecomeActive:(UIScene *)scene
{
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  if ([appDelegate respondsToSelector:@selector(applicationDidBecomeActive:)]) {
    [appDelegate applicationDidBecomeActive:UIApplication.sharedApplication];
  }
}

- (void)sceneWillResignActive:(UIScene *)scene
{
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  if ([appDelegate respondsToSelector:@selector(applicationWillResignActive:)]) {
    [appDelegate applicationWillResignActive:UIApplication.sharedApplication];
  }
}

- (void)sceneDidEnterBackground:(UIScene *)scene
{
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  if ([appDelegate respondsToSelector:@selector(applicationDidEnterBackground:)]) {
    [appDelegate applicationDidEnterBackground:UIApplication.sharedApplication];
  }
}

- (void)sceneWillEnterForeground:(UIScene *)scene
{
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;

  if ([appDelegate respondsToSelector:@selector(applicationWillEnterForeground:)]) {
    [appDelegate applicationWillEnterForeground:UIApplication.sharedApplication];
  }
}

@end
