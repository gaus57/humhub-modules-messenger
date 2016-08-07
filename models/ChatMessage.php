<?php

namespace humhub\modules\messenger\models;

use humhub\components\ActiveRecord;
use humhub\modules\user\models\User;
use humhub\modules\space\models\Space;

/**
 *
 */
class ChatMessage extends ActiveRecord
{
    /**
     * @var int Кол-во сообщений йна странице чата
     */
    public static $onPage = 20;

    /**
     * @return string the associated database table name
     */
    public static function tableName()
    {
        return 'chat_message';
    }

    /**
     * @inheritdoc
     */
    public function behaviors()
    {
        return [
            [
                'class' => \humhub\components\behaviors\PolymorphicRelation::className(),
                'mustBeInstanceOf' => array(User::className(), Space::className()),
            ],
        ];
    }

    public function renderText()
    {
        $text = $this->text;
        /*$text = preg_replace_callback('/\[\[([^\s\]]+)\s?([^\]]+)?\]\]/m', function($matches) {
            return '<a target="_blank" href="'.$matches[1].'">'.(isset($matches[2]) ? $matches[2] : $matches[1]) .'</a>';
        }, $text);
        
		.replace(/&#([^;]+);/mg, function(str, p1){
			var smileArr = p1.split('.');
			var smile = that.renderSmile(smileArr[0], smileArr[1]);
			return smile ? smile : str;
		});
return text.replace(/(\r\n|\r|\n)/gm, '<br>');*/

        return $text;
    }

    public static function getSpaceLastMsg($id)
    {
        if (is_array($id)) {
            return self::find()->with('user')
                ->where(['object_model' => Space::className()])
                ->where(['in', 'object_id', $id])
                ->orderBy(['created_at' => SORT_DESC])
                ->groupBy('object_id')
                ->indexBy('object_id')
                ->all();
        }

        return self::find()->with('user')
            ->where(['object_model' => Space::className()])
            ->where(['object_id' => $id])
            ->orderBy(['created_at' => SORT_DESC])
            ->one();
    }

    public static function getMyUserLastMsg()
    {
        return self::find()->with(['user'])
            ->where(['object_model' => User::className()])
            ->where(['or', 'object_id='.\Yii::$app->user->id, 'user_id='.\Yii::$app->user->id])
            ->orderBy(['created_at' => SORT_DESC])
            ->groupBy(['object_model', 'object_id'])
            ->all();
    }

    public static function getChatList()
    {
        $list = self::find()->with(['user']);
        $list->orWhere(["user_id" => \Yii::$app->user->id]);
        $list->orWhere(['and', "object_model='".User::className()."'", 'object_id='.\Yii::$app->user->id]);
        $list = $list->orderBy(['created_at' => SORT_DESC])
            ->groupBy(['object_model', 'object_id'])
            ->all();
        $items = [];
        foreach ($list as $item) {
            $key = $item->type.$item->user_id.'-'.$item->object_id;
            if ($item->getObjectIsUser() && isset($items[$key])) {
                continue;
            }
            $items[$key] = $item;
        }

        return $items;
    }

    public static function findUserMessages($id, $start = null)
    {
        $query = self::find()->with('user')
            ->where(['object_model' => User::className()])
            ->andWhere([
                'or',
                ['and', 'object_id = ' . $id, 'user_id = ' . \Yii::$app->user->id],
                ['and', 'object_id = ' . \Yii::$app->user->id, 'user_id = ' . $id]
            ]);
        if ($start) {
            $query->where(['<', 'id', $start]);
        }

        return $query->orderBy(['id' => SORT_DESC])->limit(self::$onPage)->asArray(false)->all();
    }

    public static function findSpaceMessages($id, $start = null)
    {
        $query = self::find()->with('user')
            ->where(['object_model' => Space::className()])
            ->andWhere(['object_id' => $id]);
        if ($start) {
            $query->where(['<', 'id', $start]);
        }

        return $query->orderBy(['id' => SORT_DESC])->limit(self::$onPage)->asArray(false)->all();
    }

    public function getObjectIsUser()
    {
        return $this->object_model == User::className();
    }

    public function getObjectIsSpace()
    {
        return $this->object_model == Space::className();
    }

    public function getIsCurrentUser()
    {
        return $this->user_id == \Yii::$app->user->id;
    }

    public function getType()
    {
        if ($this->objectIsUser) return 'user';
        if ($this->objectIsSpace) return 'space';

        return null;
    }

    public function getUser()
    {
        return $this->hasOne(User::className(), ['id' => 'user_id']);
    }
}
