<div class="container">
    <div class="panel panel-default">
       <div class="panel-heading">Мои сообщения</div>

        <div class="panel-body">
            <form class="form-search" action="" method="get">
                <div class="row">
                    <div class="col-md-3"></div>
                    <div class="col-md-6">
                        <div class="form-group form-group-search">
                            <input type="text" class="form-control form-search" name="keyword" value="" placeholder="поиск">
                            <button type="submit" class="btn btn-default btn-sm form-button-search">Поиск</button>
                        </div>
                    </div>
                    <div class="col-md-3"></div>
                </div>
            </form>
        </div>
        <hr>

        <ul id="tabs" class="nav nav-tabs" data-tabs="tabs">
            <li class="active"><a href="#user-chats" data-toggle="tab">Личная переписка</a></li>
            <li class=""><a href="#space-chats" data-toggle="tab">Чаты пространств</a></li>
        </ul>
        <div class="tab-content">
            <div id="user-chats" class="tab-pane active">
                <ul class="media-list">
                    <?php foreach ($userChats as $item) {
                        include '_user-item.php';
                    }
                    ?>
                </ul>
            </div>
            <div id="space-chats" class="tab-pane">
                <ul class="media-list">
                    <?php foreach ($spaceChats as $item) {
                        include '_space-item.php';
                    }
                    ?>
                </ul>
            </div>
        </div>
    </div>
</div>