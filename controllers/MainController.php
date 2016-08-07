<?php

namespace humhub\modules\messenger\controllers;

use humhub\components\Controller;
use humhub\modules\space\models\Space;
use humhub\modules\user\models\User;
use yii\web\HttpException;
use humhub\modules\messenger\models\ChatMessage;
use yii\web\NotFoundHttpException;

class MainController extends Controller
{
    public function init()
    {
        $this->appendPageTitle(\Yii::t('MessengerModule.base', 'Messages'));
        return parent::init();
    }

    public function beforeAction($action)
    {
        if (parent::beforeAction($action)) {
            if (\Yii::$app->user->isGuest) {
                throw new HttpException(403, 'Модуль сообщений доступен только авторизованным пользователям!');
            }

            return true;
        }

        return false;
    }

    public function actionIndex()
    {
        $chats = [];
        $spaces = \Yii::$app->user->identity->getSpaces()->indexBy('id')->all();
        $spaceChats = [];
        foreach ($spaces as $id => $space) {
            $spaceChats[] = [
                'chat' => $space,
                'msg' => ChatMessage::getSpaceLastMsg($id)
            ];
        }
        $userChats = [];
        foreach (ChatMessage::getMyUserLastMsg() as $msg) {
            if (isset($userChats[$msg->object_id.'-'.$msg->user_id])) {
                continue;
            }
            $userChats[$msg->user_id.'-'.$msg->object_id] = [
                'chat' => $msg->getIsCurrentUser() ? $msg->getPolymorphicRelation() : $msg->user,
                'msg' => $msg
            ];
        }

        return $this->render('index', [
            'spaceChats' => $spaceChats,
            'userChats' => $userChats,
        ]);
    }

    public function actionViewSpace($alias)
    {
        $space = Space::findOne(['url' => $alias]);
        if (!$space) {
            throw new NotFoundHttpException('Страница не найдена');
        }
        
        $messages = ChatMessage::findSpaceMessages($space->id);

        return $this->render('view-space', [
            'space' => $space,
            'messages' => array_reverse($messages),
        ]);
    }

    public function actionViewUser($alias)
    {
        $user = User::findOne(['username' => $alias]);
        if (!$user) {
            throw new NotFoundHttpException('Страница не найдена');
        }

        $messages = ChatMessage::findUserMessages($user->id);

        return $this->render('view-user', [
            'user' => $user,
            'messages' => array_reverse($messages),
        ]);
    }
}
